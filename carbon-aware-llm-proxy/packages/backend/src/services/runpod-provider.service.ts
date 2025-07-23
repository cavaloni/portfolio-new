import axios, { AxiosResponse } from "axios";
import { logger } from "../utils/logger";
import { databaseService } from "./database.service";
import {
  RunPodDeployment,
  DeploymentStatus,
} from "../entities/RunPodDeployment";
import { RunPodInstance } from "../entities/RunPodInstance";
import { CARBON_CALCULATION_CONFIG } from "../config/runpod.config";

interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface RunPodChatResponse extends ChatCompletionResponse {
  carbon_footprint?: {
    emissions_gco2e: number;
    energy_consumed_kwh: number;
    region: string;
    model_name: string;
  };
}

/**
 * RunPod Provider Service - handles chat completions through RunPod deployments
 * Integrates with the existing carbon-aware routing system
 */
class RunPodProviderService {
  /**
   * Send a chat completion request to the best available RunPod deployment
   */
  async sendChatCompletion(
    request: ChatCompletionRequest,
    options: {
      preferredRegions?: string[];
      maxRetries?: number;
      timeout?: number;
    } = {},
  ): Promise<RunPodChatResponse> {
    const { preferredRegions = [], maxRetries = 3, timeout = 30000 } = options;

    // Get the best deployment based on carbon efficiency and availability
    const deployment = await this.selectOptimalDeployment(
      request.model,
      preferredRegions,
    );

    if (!deployment) {
      throw new Error(
        `No available deployments found for model: ${request.model}`,
      );
    }

    let lastError: Error | null = null;

    // Try the selected deployment with retries
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(
          `Attempting chat completion (${attempt}/${maxRetries}) with deployment ${deployment.id}`,
        );

        const response = await this.makeRequest(deployment, request, timeout);

        // Record successful request
        await this.recordSuccessfulRequest(
          deployment,
          response.usage.total_tokens,
        );

        // Add carbon footprint information
        const carbonFootprint = this.calculateCarbonFootprint(
          deployment,
          response.usage.total_tokens,
        );

        return {
          ...response,
          carbon_footprint: carbonFootprint,
        };
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          `Request failed (attempt ${attempt}/${maxRetries}):`,
          error,
        );

        // Record failed request
        await this.recordFailedRequest(deployment);

        // If this was the last attempt, try to find an alternative deployment
        if (attempt === maxRetries) {
          const alternativeDeployment = await this.selectOptimalDeployment(
            request.model,
            preferredRegions,
            [deployment.id], // exclude the failed deployment
          );

          if (alternativeDeployment) {
            logger.info(
              `Trying alternative deployment: ${alternativeDeployment.id}`,
            );
            try {
              const response = await this.makeRequest(
                alternativeDeployment,
                request,
                timeout,
              );
              await this.recordSuccessfulRequest(
                alternativeDeployment,
                response.usage.total_tokens,
              );

              const carbonFootprint = this.calculateCarbonFootprint(
                alternativeDeployment,
                response.usage.total_tokens,
              );

              return {
                ...response,
                carbon_footprint: carbonFootprint,
              };
            } catch (altError) {
              logger.error("Alternative deployment also failed:", altError);
              await this.recordFailedRequest(alternativeDeployment);
            }
          }
        }
      }
    }

    throw lastError || new Error("All deployment attempts failed");
  }

  /**
   * Select the optimal deployment based on carbon efficiency and availability
   */
  private async selectOptimalDeployment(
    modelId: string,
    preferredRegions: string[] = [],
    excludeDeployments: string[] = [],
  ): Promise<RunPodDeployment | null> {
    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);

    // Get all healthy deployments for the model
    const deployments = await deploymentRepo.find({
      where: {
        modelId,
        status: DeploymentStatus.RUNNING,
        healthStatus: "healthy",
      },
      relations: ["instances"],
    });

    if (deployments.length === 0) {
      logger.warn(`No healthy deployments found for model: ${modelId}`);
      return null;
    }

    // Filter out excluded deployments
    const availableDeployments = deployments.filter(
      (d) => !excludeDeployments.includes(d.id),
    );

    if (availableDeployments.length === 0) {
      logger.warn(`No available deployments after filtering exclusions`);
      return null;
    }

    // Score deployments based on carbon efficiency, availability, and preferences
    const scoredDeployments = availableDeployments.map((deployment) => {
      let score = 0;

      // Carbon efficiency score (higher is better, lower carbon intensity)
      const maxCarbonIntensity = Math.max(
        ...availableDeployments.map((d) => d.carbonIntensity || 1),
      );
      const carbonScore =
        maxCarbonIntensity > 0
          ? (maxCarbonIntensity - (deployment.carbonIntensity || 1)) /
            maxCarbonIntensity
          : 0;
      score += carbonScore * 0.4; // 40% weight for carbon efficiency

      // Availability score (based on current replicas vs max replicas)
      const availabilityScore =
        deployment.currentReplicas > 0
          ? Math.min(deployment.currentReplicas / deployment.maxReplicas, 1)
          : 0;
      score += availabilityScore * 0.3; // 30% weight for availability

      // Regional preference score
      const regionScore =
        preferredRegions.length > 0 &&
        preferredRegions.includes(deployment.region)
          ? 1
          : 0.5;
      score += regionScore * 0.2; // 20% weight for regional preference

      // Health and recency score
      const healthScore = deployment.lastHealthCheck
        ? Math.max(
            0,
            1 -
              (Date.now() - deployment.lastHealthCheck.getTime()) /
                (1000 * 60 * 10),
          ) // 10 minutes decay
        : 0.5;
      score += healthScore * 0.1; // 10% weight for health recency

      return { deployment, score };
    });

    // Sort by score (highest first) and return the best deployment
    scoredDeployments.sort((a, b) => b.score - a.score);

    const selectedDeployment = scoredDeployments[0].deployment;
    logger.info(
      `Selected deployment ${selectedDeployment.id} in region ${selectedDeployment.region} (score: ${scoredDeployments[0].score.toFixed(3)})`,
    );

    return selectedDeployment;
  }

  /**
   * Make the actual HTTP request to the RunPod deployment
   */
  private async makeRequest(
    deployment: RunPodDeployment,
    request: ChatCompletionRequest,
    timeout: number,
  ): Promise<ChatCompletionResponse> {
    if (!deployment.endpointUrl) {
      throw new Error(`Deployment ${deployment.id} has no endpoint URL`);
    }

    const url = `${deployment.endpointUrl}/v1/chat/completions`;

    const response: AxiosResponse<ChatCompletionResponse> = await axios.post(
      url,
      request,
      {
        timeout,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
        },
      },
    );

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.data;
  }

  /**
   * Record a successful request for metrics and health tracking
   */
  private async recordSuccessfulRequest(
    deployment: RunPodDeployment,
    tokensProcessed: number,
  ): Promise<void> {
    try {
      const deploymentRepo = databaseService
        .getDataSource()
        .getRepository(RunPodDeployment);
      await deploymentRepo.update(deployment.id, {
        lastHealthCheck: new Date(),
        healthStatus: "healthy",
      });

      // Update instance metrics if available
      if (deployment.instances && deployment.instances.length > 0) {
        const instanceRepo = databaseService
          .getDataSource()
          .getRepository(RunPodInstance);
        const activeInstance = deployment.instances.find((i) => i.isHealthy);

        if (activeInstance) {
          activeInstance.updatePerformanceMetrics(0, tokensProcessed); // Response time would be measured separately
          await instanceRepo.save(activeInstance);
        }
      }
    } catch (error) {
      logger.error("Failed to record successful request:", error);
    }
  }

  /**
   * Record a failed request for health tracking
   */
  private async recordFailedRequest(
    deployment: RunPodDeployment,
  ): Promise<void> {
    try {
      const deploymentRepo = databaseService
        .getDataSource()
        .getRepository(RunPodDeployment);
      await deploymentRepo.update(deployment.id, {
        lastHealthCheck: new Date(),
        healthStatus: "unhealthy",
      });

      // Update instance failure metrics if available
      if (deployment.instances && deployment.instances.length > 0) {
        const instanceRepo = databaseService
          .getDataSource()
          .getRepository(RunPodInstance);
        const activeInstance = deployment.instances.find(
          (i) => i.status === "running",
        );

        if (activeInstance) {
          activeInstance.recordHealthCheckFailure();
          await instanceRepo.save(activeInstance);
        }
      }
    } catch (error) {
      logger.error("Failed to record failed request:", error);
    }
  }

  /**
   * Calculate carbon footprint for a request
   */
  private calculateCarbonFootprint(
    deployment: RunPodDeployment,
    tokensProcessed: number,
  ): {
    emissions_gco2e: number;
    energy_consumed_kwh: number;
    region: string;
    model_name: string;
  } {
    // Estimate energy consumption based on tokens processed
    // This is a simplified calculation - in production, you'd want more sophisticated modeling
    const energyPerToken = 1 / CARBON_CALCULATION_CONFIG.tokensPerKWh; // kWh per token
    const energyConsumed = tokensProcessed * energyPerToken;

    // Apply PUE and infrastructure overhead
    const totalEnergyConsumed =
      energyConsumed *
      CARBON_CALCULATION_CONFIG.averagePUE *
      (1 + CARBON_CALCULATION_CONFIG.infrastructureOverhead);

    // Calculate emissions based on regional carbon intensity
    const emissions =
      totalEnergyConsumed * (deployment.carbonIntensity || 0.5) * 1000; // Convert to grams

    return {
      emissions_gco2e: Math.round(emissions * 100) / 100, // Round to 2 decimal places
      energy_consumed_kwh: Math.round(totalEnergyConsumed * 1000000) / 1000000, // Round to 6 decimal places
      region: deployment.region,
      model_name: deployment.modelId,
    };
  }

  /**
   * Get deployment statistics for monitoring
   */
  async getDeploymentStats(): Promise<{
    totalDeployments: number;
    healthyDeployments: number;
    totalInstances: number;
    totalCostPerHour: number;
    totalCarbonFootprintPerHour: number;
  }> {
    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);

    const deployments = await deploymentRepo.find({
      where: { status: DeploymentStatus.RUNNING },
      relations: ["instances"],
    });

    const stats = {
      totalDeployments: deployments.length,
      healthyDeployments: deployments.filter(
        (d) => d.healthStatus === "healthy",
      ).length,
      totalInstances: deployments.reduce(
        (sum, d) => sum + d.currentReplicas,
        0,
      ),
      totalCostPerHour: deployments.reduce(
        (sum, d) => sum + d.calculateTotalCostPerHour(),
        0,
      ),
      totalCarbonFootprintPerHour: 0,
    };

    // Calculate total carbon footprint (simplified)
    stats.totalCarbonFootprintPerHour = deployments.reduce(
      (sum, deployment) => {
        const gpuPower = 400; // Average GPU power consumption in watts
        return sum + deployment.calculateCarbonFootprint(gpuPower);
      },
      0,
    );

    return stats;
  }
}

export const runPodProviderService = new RunPodProviderService();
