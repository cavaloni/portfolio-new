import axios, { AxiosInstance } from "axios";
import { logger } from "../utils/logger";
import { databaseService } from "./database.service";
import {
  RunPodDeployment,
  DeploymentStatus,
} from "../entities/RunPodDeployment";
import { RunPodInstance, InstanceStatus } from "../entities/RunPodInstance";
import {
  MODEL_CONFIGS,
  GPU_TYPES,
  RUNPOD_REGIONS,
  VLLM_STARTUP_COMMAND,
  HEALTH_CHECK_CONFIG,
  DEFAULT_DEPLOYMENT_CONFIG,
  ModelConfig,
  GpuType,
  RunPodRegion,
} from "../config/runpod.config";

interface RunPodPod {
  id: string;
  name: string;
  runtime: {
    uptimeInSeconds: number;
    ports: Array<{
      ip: string;
      isIpPublic: boolean;
      privatePort: number;
      publicPort: number;
      type: string;
    }>;
  };
  machine: {
    podHostId: string;
    gpuCount: number;
    vcpuCount: number;
    memoryInGb: number;
    diskInGb: number;
  };
  desiredStatus: string;
  lastStatusChange: string;
  costPerHr: number;
}

interface RunPodEndpoint {
  id: string;
  name: string;
  status: string;
  url?: string;
  pods: RunPodPod[];
}

class RunPodService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.RUNPOD_API_KEY || "";
    if (!this.apiKey) {
      logger.warn(
        "RunPod API key not configured. RunPod integration will be disabled.",
      );
    }

    this.client = axios.create({
      baseURL: "https://api.runpod.io/graphql",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  /**
   * Deploy a model to RunPod in specified regions
   */
  async deployModel(
    modelId: ModelConfig,
    regions: RunPodRegion[],
    options: {
      gpuType?: GpuType;
      minReplicas?: number;
      maxReplicas?: number;
      autoScaling?: boolean;
    } = {},
  ): Promise<RunPodDeployment[]> {
    const modelConfig = MODEL_CONFIGS[modelId];
    if (!modelConfig) {
      throw new Error(`Unknown model configuration: ${modelId}`);
    }

    const {
      gpuType = "NVIDIA GeForce RTX 4090",
      minReplicas = 1,
      maxReplicas = 3,
      autoScaling = true,
    } = options;

    logger.info(`🚀 Starting RunPod deployment for ${modelConfig.displayName}`);
    logger.info(`📍 Regions: ${regions.join(", ")}`);
    logger.info(`🖥️ GPU Type: ${gpuType}`);
    logger.info(`📊 Replicas: ${minReplicas}-${maxReplicas} (auto-scaling: ${autoScaling})`);

    const deployments: RunPodDeployment[] = [];
    const failedRegions: string[] = [];

    for (const region of regions) {
      try {
        logger.info(`\n📦 Deploying ${modelId} to region ${region}...`);

        const deployment = await this.createDeployment(
          modelId,
          modelConfig,
          region,
          gpuType,
          { minReplicas, maxReplicas, autoScaling },
        );

        deployments.push(deployment);
        logger.info(`✅ Deployment initiated for ${region}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`❌ Failed to deploy ${modelId} to region ${region}: ${errorMessage}`);
        failedRegions.push(region);
      }
    }

    // Summary
    logger.info(`\n📋 Deployment Summary:`);
    logger.info(`   ✅ Successful: ${deployments.length} regions`);
    if (failedRegions.length > 0) {
      logger.info(`   ❌ Failed: ${failedRegions.join(", ")}`);
    }

    return deployments;
  }

  /**
   * Create a new deployment in the database and initiate RunPod endpoint creation
   */
  private async createDeployment(
    modelId: ModelConfig,
    modelConfig: (typeof MODEL_CONFIGS)[ModelConfig],
    region: RunPodRegion,
    gpuType: GpuType,
    options: { minReplicas: number; maxReplicas: number; autoScaling: boolean },
  ): Promise<RunPodDeployment> {
    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);

    // Check if deployment already exists for this model and region
    const existingDeployment = await deploymentRepo.findOne({
      where: { modelId, region },
    });

    if (
      existingDeployment &&
      existingDeployment.status !== DeploymentStatus.FAILED
    ) {
      logger.info(`ℹ️ Deployment already exists for ${modelId} in ${region} (ID: ${existingDeployment.id.substring(0, 8)}...)`);
      return existingDeployment;
    }

    const regionConfig = RUNPOD_REGIONS[region];
    const gpuConfig = GPU_TYPES[gpuType];

    // Create RunPod endpoint first (don't persist to DB until this succeeds)
    logger.info(`🚀 Creating RunPod endpoint (this may take several minutes)...`);
    
    let runpodEndpointId: string;
    let endpointUrl: string | undefined;
    
    try {
      const runpodResult = await this.createRunPodEndpoint(modelId, modelConfig, region, gpuType, options);
      runpodEndpointId = runpodResult.endpointId;
      endpointUrl = runpodResult.endpointUrl;
      logger.info(`✅ RunPod deployment completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`❌ RunPod deployment failed: ${errorMessage}`);
      // Don't create database record if RunPod fails
      throw new Error(`RunPod deployment failed for ${modelId} in ${region}: ${errorMessage}`);
    }

    // Only create database record after RunPod succeeds
    logger.info(`💾 Creating deployment record in database...`);
    
    const deployment = deploymentRepo.create({
      modelId,
      region,
      gpuType,
      status: DeploymentStatus.RUNNING,
      minReplicas: options.minReplicas,
      maxReplicas: options.maxReplicas,
      autoScaling: options.autoScaling,
      carbonIntensity: regionConfig.carbonIntensity,
      deploymentCostPerHour: gpuConfig.costPerHour,
      runpodEndpointId,
      endpointUrl,
      configuration: {
        modelConfig,
        regionConfig,
        gpuConfig,
      },
    });

    const savedDeployment = await deploymentRepo.save(deployment);
    logger.info(`💾 Deployment record created in database`);

    return savedDeployment;
  }

  /**
   * Create RunPod serverless endpoint
   */
  private async createRunPodEndpoint(
    modelId: ModelConfig,
    modelConfig: (typeof MODEL_CONFIGS)[ModelConfig],
    region: RunPodRegion,
    gpuType: GpuType,
    options: { minReplicas: number; maxReplicas: number; autoScaling: boolean },
  ): Promise<{ endpointId: string; endpointUrl: string | undefined }> {
    const regionConfig = RUNPOD_REGIONS[region];
    const gpuConfig = GPU_TYPES[gpuType];

    logger.info(`🏗️ Creating RunPod template for ${modelId}...`);
    logger.info(`   📍 Region: ${region}`);
    logger.info(`   🖥️ GPU: ${gpuType}`);
    logger.info(`   📦 Model: ${modelConfig.modelName}`);

    const mutation = `
      mutation {
        saveTemplate(input: {
          containerDiskInGb: ${DEFAULT_DEPLOYMENT_CONFIG.containerDiskSize}
          dockerArgs: "${VLLM_STARTUP_COMMAND(modelConfig.modelName, modelConfig).join(" ")}"
          env: [
            {key: "MODEL_NAME", value: "${modelConfig.modelName}"}
            {key: "MAX_MODEL_LEN", value: "${modelConfig.maxSequenceLength}"}
            {key: "TENSOR_PARALLEL_SIZE", value: "${modelConfig.tensorParallelism}"}
          ]
          imageName: "${modelConfig.dockerImage}"
          name: "${modelId}-${region}-${Date.now()}"
          ports: "8000/http"
          volumeInGb: ${DEFAULT_DEPLOYMENT_CONFIG.volumeSize}
          volumeMountPath: "/workspace"
        }) {
          id
          name
        }
      }
    `;

    try {
      logger.info(`📝 Sending template creation request to RunPod...`);
      const response = await this.client.post("", { query: mutation }).catch((error) => {
        const errorMessage = `RunPod template creation request failed: ${error.message}`;
        logger.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
      });

      if (response.data.errors) {
        const errorMessage = `RunPod template creation failed: ${JSON.stringify(response.data.errors)}`;
        logger.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const templateId = response.data.data.saveTemplate.id;
      logger.info(`✅ RunPod template created: ${templateId}`);

      // Create serverless endpoint
      logger.info(`🌐 Creating RunPod serverless endpoint...`);
      const endpointMutation = `
        mutation {
          saveEndpoint(input: {
            name: "${modelId}-${region}"
            templateId: "${templateId}"
            gpuIds: "${this.getGpuId(gpuType)}"
            idleTimeout: ${DEFAULT_DEPLOYMENT_CONFIG.maxIdleTime}
            scalerType: "QUEUE_DELAY"
            scalerValue: 1
            workersMin: ${options.minReplicas}
            workersMax: ${options.maxReplicas}
            locations: "${region}"
          }) {
            id
            name
          }
        }
      `;

      const endpointResponse = await this.client.post("", {
        query: endpointMutation,
      }).catch((error) => {
        const errorMessage = `RunPod endpoint creation request failed: ${error.message}`;
        logger.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
      });

      if (endpointResponse.data.errors) {
        const errorMessage = `RunPod endpoint creation failed: ${JSON.stringify(endpointResponse.data.errors)}`;
        logger.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const endpoint = endpointResponse.data.data.saveEndpoint;
      logger.info(`✅ RunPod endpoint created: ${endpoint.id}`);

      // Try to fetch the endpoint URL with retry logic
      // Retry up to 5 times with exponential backoff: 1s, 2s, 4s, 8s, 16s (total ~30s)
      logger.info(`🔍 Fetching endpoint URL from RunPod (will retry up to 5 times if not ready)...`);
      let endpointUrl: string | undefined;
      
      // Retry URL fetching with exponential backoff
      const maxRetries = 5;
      const baseDelay = 1000; // 1 second
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const urlQuery = `
            query {
              serverlessEndpoint(id: "${endpoint.id}") {
                id
                name
                url
                status
              }
            }
          `;

          const urlResponse = await this.client.post("", { query: urlQuery }).catch((error) => {
            const errorMessage = `RunPod URL fetch request failed: ${error.message}`;
            logger.error(`❌ ${errorMessage}`);
            throw new Error(errorMessage);
          });
          
          if (urlResponse.data.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(urlResponse.data.errors)}`);
          }
          
          endpointUrl = urlResponse.data.data.serverlessEndpoint?.url;
          if (endpointUrl) {
            if (attempt > 1) {
              logger.info(`✅ RunPod endpoint URL retrieved on attempt ${attempt}: ${endpointUrl}`);
            } else {
              logger.info(`✅ RunPod endpoint URL retrieved: ${endpointUrl}`);
            }
            break; // Success, exit retry loop
          } else {
            throw new Error("Endpoint URL not available yet");
          }
        } catch (urlError) {
          const isLastAttempt = attempt === maxRetries;
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          
          if (isLastAttempt) {
            logger.warn(`⚠️ Failed to fetch endpoint URL after ${maxRetries} attempts (total wait time: ~${(baseDelay * (Math.pow(2, maxRetries) - 1)) / 1000}s)`);
            logger.info(`ℹ️ This is normal for new endpoints - URL will be fetched later via update-urls command`);
            endpointUrl = undefined;
          } else {
            logger.info(`⏳ Attempt ${attempt}/${maxRetries}: Endpoint URL not ready yet, retrying in ${delay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      return { endpointId: endpoint.id, endpointUrl };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`💥 RunPod deployment failed:`);
      logger.error(`   Model: ${modelId}`);
      logger.error(`   Region: ${region}`);
      logger.error(`   Error: ${errorMessage}`);
      throw new Error(`RunPod deployment failed for ${modelId} in ${region}: ${errorMessage}`);
    }
  }

  /**
   * Get GPU ID for RunPod API based on GPU type
   */
  private getGpuId(gpuType: string): string {
    const gpuMap: Record<string, string> = {
      "NVIDIA GeForce RTX 4090": "NVIDIA GeForce RTX 4090",
      "NVIDIA RTX A6000": "NVIDIA RTX A6000",
      "NVIDIA A100 80GB": "NVIDIA A100 80GB PCIe",
    };

    return gpuMap[gpuType] || gpuType;
  }

  /**
   * Update deployment status
   */
  private async updateDeploymentStatus(
    deploymentId: string,
    status: DeploymentStatus,
    errorMessage?: string,
  ): Promise<void> {
    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);
    const updateData: Partial<RunPodDeployment> = { status };

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await deploymentRepo.update(deploymentId, updateData);
  }

  /**
   * Get all active deployments
   */
  async getActiveDeployments(): Promise<RunPodDeployment[]> {
    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);
    return deploymentRepo.find({
      where: {
        status: DeploymentStatus.RUNNING,
      },
      relations: ["model", "instances"],
    });
  }

  /**
   * Get deployments for a specific model
   */
  async getModelDeployments(modelId: string): Promise<RunPodDeployment[]> {
    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);
    return deploymentRepo.find({
      where: { modelId },
      relations: ["model", "instances"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Perform health checks on all active deployments
   */
  async performHealthChecks(): Promise<void> {
    logger.info("🏥 Starting health checks for all active deployments...");

    // First, update endpoint URLs for deployments that don't have them
    await this.updateEndpointUrls();

    const deployments = await this.getActiveDeployments();

    if (deployments.length === 0) {
      logger.info("ℹ️ No active deployments to check");
      return;
    }

    logger.info(`🔍 Checking health of ${deployments.length} deployments...`);

    const healthCheckPromises = deployments.map((deployment) =>
      this.checkDeploymentHealth(deployment),
    );

    await Promise.allSettled(healthCheckPromises);

    logger.info("✅ Health checks completed");
  }

  /**
   * Update endpoint URLs for deployments that don't have them
   */
  async updateEndpointUrls(): Promise<void> {
    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);

    // Get deployments that are running but don't have endpoint URLs
    const deployments = await deploymentRepo.find({
      where: {
        status: DeploymentStatus.RUNNING,
        endpointUrl: undefined,
      },
    });

    if (deployments.length === 0) {
      logger.info("✅ All running deployments have endpoint URLs");
      return;
    }

    logger.info(`🔍 Updating endpoint URLs for ${deployments.length} deployments...`);

    for (const deployment of deployments) {
      if (!deployment.runpodEndpointId) {
        logger.warn(`⚠️ Deployment ${deployment.id} has no RunPod endpoint ID`);
        continue;
      }

      try {
        const urlQuery = `
          query {
            serverlessEndpoint(id: "${deployment.runpodEndpointId}") {
              id
              name
              url
              status
            }
          }
        `;

        const response = await this.client.post("", { query: urlQuery }).catch((error) => {
          const errorMessage = `RunPod URL fetch request failed for deployment ${deployment.id}: ${error.message}`;
          logger.error(`❌ ${errorMessage}`);
          throw new Error(errorMessage);
        });
        
        if (response.data.errors) {
          logger.warn(`⚠️ Could not fetch URL for deployment ${deployment.id}: ${JSON.stringify(response.data.errors)}`);
          continue;
        }

        const endpoint = response.data.data.serverlessEndpoint;
        if (endpoint?.url) {
          await deploymentRepo.update(deployment.id, {
            endpointUrl: endpoint.url,
          });
          logger.info(`✅ Updated endpoint URL for deployment ${deployment.id}: ${endpoint.url}`);
        } else {
          logger.info(`ℹ️ Endpoint URL not yet available for deployment ${deployment.id} (status: ${endpoint?.status || 'unknown'})`);
        }
      } catch (error) {
        logger.error(`❌ Failed to update endpoint URL for deployment ${deployment.id}:`, error);
      }
    }
  }

  /**
   * Check health of a specific deployment
   */
  private async checkDeploymentHealth(
    deployment: RunPodDeployment,
  ): Promise<void> {
    // First, try to update the endpoint URL if it's missing
    if (!deployment.endpointUrl && deployment.runpodEndpointId) {
      try {
        const urlQuery = `
          query {
            serverlessEndpoint(id: "${deployment.runpodEndpointId}") {
              id
              name
              url
              status
            }
          }
        `;

        const response = await this.client.post("", { query: urlQuery }).catch((error) => {
          const errorMessage = `RunPod URL fetch request failed for deployment ${deployment.id}: ${error.message}`;
          logger.error(`❌ ${errorMessage}`);
          throw new Error(errorMessage);
        });
        
        if (!response.data.errors && response.data.data.serverlessEndpoint?.url) {
          const deploymentRepo = databaseService
            .getDataSource()
            .getRepository(RunPodDeployment);
          await deploymentRepo.update(deployment.id, {
            endpointUrl: response.data.data.serverlessEndpoint.url,
          });
          deployment.endpointUrl = response.data.data.serverlessEndpoint.url;
          logger.info(`✅ Updated endpoint URL for deployment ${deployment.id}: ${deployment.endpointUrl}`);
        }
      } catch (error) {
        logger.warn(`⚠️ Could not update endpoint URL for deployment ${deployment.id}:`, error);
      }
    }

    if (!deployment.endpointUrl) {
      logger.warn(`No endpoint URL for deployment ${deployment.id}`);
      return;
    }

    try {
      const healthUrl = `${deployment.endpointUrl}${HEALTH_CHECK_CONFIG.endpoint}`;
      const response = await axios.get(healthUrl, {
        timeout: HEALTH_CHECK_CONFIG.timeoutSeconds * 1000,
      });

      const isHealthy = response.status === 200;

      const deploymentRepo = databaseService
        .getDataSource()
        .getRepository(RunPodDeployment);
      await deploymentRepo.update(deployment.id, {
        healthStatus: isHealthy ? "healthy" : "unhealthy",
        lastHealthCheck: new Date(),
      });

      logger.info(
        `Health check for deployment ${deployment.id}: ${
          isHealthy ? "✅ healthy" : "❌ unhealthy"
        }`,
      );
    } catch (error) {
      logger.error(`Health check failed for deployment ${deployment.id}:`, error);
      
      const deploymentRepo = databaseService
        .getDataSource()
        .getRepository(RunPodDeployment);
      await deploymentRepo.update(deployment.id, {
        healthStatus: "unhealthy",
        lastHealthCheck: new Date(),
      });
    }
  }

  /**
   * List all RunPod endpoints directly from API
   */
  async listRunPodEndpoints(options: { syncWithDatabase?: boolean } = {}): Promise<Array<{ id: string; name: string; status: string }>> {
    if (!this.apiKey) {
      const errorMessage = "RunPod API key not configured. Please set RUNPOD_API_KEY environment variable.";
      logger.error(`❌ ${errorMessage}`);
      throw new Error(errorMessage);
    }

    try {
      logger.info("🔍 Querying RunPod API directly for all serverless endpoints...");

      // Try different possible GraphQL queries for listing endpoints
      const possibleQueries = [
        // Attempt 1: Correct structure based on error analysis
        `
          query {
            myself {
              endpoints {
                id
                name
                template {
                  id
                  name
                }
                workersMax
                workersMin
              }
            }
          }
        `,
        // Attempt 2: Minimal query to get basic info
        `
          query {
            myself {
              endpoints {
                id
                name
              }
            }
          }
        `,
        // Attempt 3: Try with additional fields that might exist
        `
          query {
            myself {
              endpoints {
                id
                name
                template {
                  name
                }
                workersMax
                workersMin
                workersActive
              }
            }
          }
        `,
        // Attempt 4: Query pods instead as fallback to see the pattern
        `
          query {
            myself {
              pods {
                id
                name
                desiredStatus
              }
            }
          }
        `
      ];

      let endpoints: Array<{ id: string; name: string; status: string }> = [];
      let lastError: Error | null = null;

      // Try each query until one works
      for (let i = 0; i < possibleQueries.length; i++) {
        const query = possibleQueries[i];
        try {
          logger.info(`🔍 Attempting GraphQL query method ${i + 1}/${possibleQueries.length}...`);
          
          const response = await this.client.post("", { query }).catch((error) => {
            let errorMessage = `HTTP request failed: ${error.message}`;
            if (error.response?.data) {
              errorMessage += ` - Response: ${JSON.stringify(error.response.data)}`;
            }
            throw new Error(errorMessage);
          });

          if (response.data.errors && response.data.errors.length > 0) {
            const graphqlErrors = response.data.errors.map((e: any) => e.message).join(", ");
            throw new Error(`GraphQL errors: ${graphqlErrors}`);
          }

          // Check different possible response structures
          const data = response.data.data;
          let endpointList: any[] = [];
          
          if (data.myself?.endpoints) {
            endpointList = data.myself.endpoints;
          } else if (data.serverlessEndpoints) {
            endpointList = data.serverlessEndpoints;
          } else if (data.myself?.pods) {
            endpointList = data.myself.pods;
          }

          if (endpointList && Array.isArray(endpointList)) {
            endpoints = endpointList.map((endpoint: any) => ({
              id: endpoint.id,
              name: endpoint.name,
              status: endpoint.status || endpoint.desiredStatus || 'active',
            }));

            logger.info(`✅ Successfully queried RunPod API using method ${i + 1}`);
            logger.info(`📊 Found ${endpoints.length} serverless endpoints in RunPod:`);
            
            if (endpoints.length > 0) {
              endpoints.forEach((endpoint) => {
                logger.info(`\n🌐 ${endpoint.name} (${endpoint.id})`);
                logger.info(`   Status: ${endpoint.status}`);
              });

              // Try to sync with database if available (optional feature)
              try {
                if (options.syncWithDatabase || databaseService.getDataSource()?.isInitialized) {
                  await this.syncEndpointsWithDatabase(endpointList);
                }
              } catch (error) {
                // Database sync is optional - don't fail the main command if it doesn't work
                logger.info(`\n⚠️ Database sync skipped (database not available)`);
              }
            } else {
              logger.info("📭 No serverless endpoints found in RunPod account");
            }

            return endpoints;
          } else {
            throw new Error(`Unexpected response structure from query ${i + 1}`);
          }

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          logger.warn(`⚠️ Query method ${i + 1} failed: ${lastError.message}`);
          continue; // Try next query
        }
      }

      // If all queries failed, check if it's because there are no endpoints or if the API is broken
      if (lastError) {
        logger.error(`❌ All GraphQL query attempts failed. Last error: ${lastError.message}`);
        
        // Try a simple introspection query to test API connectivity
        try {
          logger.info("🔍 Testing basic API connectivity...");
          const testQuery = `query { __typename }`;
          const testResponse = await this.client.post("", { query: testQuery });
          
          if (testResponse.data.data?.__typename) {
            logger.info("✅ RunPod API is accessible, but serverless endpoint schema is unknown");
            logger.info("💡 This might mean you have no serverless endpoints, or the GraphQL schema has changed");
            logger.info("💡 Try creating a serverless endpoint first, then run this command again");
            return []; // Return empty array instead of throwing error
          }
        } catch (testError) {
          logger.error(`❌ Basic API connectivity test failed: ${testError}`);
        }

        throw new Error(`Failed to query RunPod endpoints. The GraphQL schema may have changed or you may not have any serverless endpoints. Last error: ${lastError.message}`);
      }

      return endpoints;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Failed to list RunPod endpoints: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Check status of a specific RunPod endpoint
   */
  async checkEndpointStatus(endpointId: string): Promise<void> {
    if (!this.apiKey) {
      const errorMessage = "RunPod API key not configured. Please set RUNPOD_API_KEY environment variable.";
      logger.error(`❌ ${errorMessage}`);
      throw new Error(errorMessage);
    }

    try {
      const query = `
        query {
          serverlessEndpoint(id: "${endpointId}") {
            id
            name
            status
            url
            template {
              id
              name
            }
            workers {
              id
              status
              pod {
                id
                name
                desiredStatus
                runtime {
                  uptimeInSeconds
                }
                machine {
                  gpuCount
                  vcpuCount
                  memoryInGb
                }
              }
            }
          }
        }
      `;

      logger.info(`🔍 Checking RunPod endpoint ${endpointId}...`);
      const response = await this.client.post("", { query }).catch((error) => {
        let errorMessage = "RunPod API request failed";
        if (error.response) {
          errorMessage = `RunPod API responded with status ${error.response.status}: ${error.response.statusText}`;
          if (error.response.data) {
            errorMessage += ` - ${JSON.stringify(error.response.data)}`;
          }
        } else if (error.request) {
          errorMessage = `Network error connecting to RunPod API: ${error.message}`;
        } else {
          errorMessage = `RunPod API client error: ${error.message}`;
        }
        
        logger.error(`❌ ${errorMessage}`);
        logger.error(`🔧 Debug info:`, {
          hasApiKey: !!this.apiKey,
          apiKeyLength: this.apiKey?.length || 0,
          baseURL: this.client.defaults.baseURL,
          endpointId,
        });
        throw new Error(errorMessage);
      });

      if (response.data.errors) {
        const errorMessage = `RunPod GraphQL errors: ${JSON.stringify(response.data.errors)}`;
        logger.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const endpoint = response.data.data.serverlessEndpoint;
      
      if (!endpoint) {
        logger.error(`❌ Endpoint ${endpointId} not found`);
        return;
      }

      logger.info(`\n🔍 Endpoint Details: ${endpoint.name} (${endpoint.id})`);
      logger.info(`   Status: ${endpoint.status}`);
      logger.info(`   URL: ${endpoint.url || 'N/A'}`);
      logger.info(`   Template: ${endpoint.template?.name || 'N/A'} (${endpoint.template?.id || 'N/A'})`);
      
      if (endpoint.workers && endpoint.workers.length > 0) {
        logger.info(`\n👥 Workers (${endpoint.workers.length}):`);
        endpoint.workers.forEach((worker: any) => {
          logger.info(`\n   Worker ${worker.id}:`);
          logger.info(`     Status: ${worker.status}`);
          if (worker.pod) {
            logger.info(`     Pod: ${worker.pod.name}`);
            logger.info(`     Desired Status: ${worker.pod.desiredStatus}`);
            if (worker.pod.runtime?.uptimeInSeconds) {
              const uptime = Math.floor(worker.pod.runtime.uptimeInSeconds / 60);
              logger.info(`     Uptime: ${uptime} minutes`);
            }
            if (worker.pod.machine) {
              logger.info(`     GPU Count: ${worker.pod.machine.gpuCount}`);
              logger.info(`     vCPU Count: ${worker.pod.machine.vcpuCount}`);
              logger.info(`     Memory: ${worker.pod.machine.memoryInGb}GB`);
            }
          }
        });
      } else {
        logger.info(`\n👥 Workers: None`);
      }

    } catch (error) {
      // Error details already logged in the API call above
      throw error;
    }
  }

  /**
   * Clean up failed deployments automatically
   */
  async cleanupFailedDeployments(options: {
    olderThanHours?: number;
    dryRun?: boolean;
  } = {}): Promise<{
    cleaned: number;
    orphanedRunPodEndpoints: string[];
  }> {
    const { olderThanHours = 24, dryRun = false } = options;
    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);

    // Find failed deployments older than specified time
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const failedDeployments = await deploymentRepo.find({
      where: {
        status: DeploymentStatus.FAILED,
        createdAt: { $lt: cutoffTime } as any,
      },
    });

    if (failedDeployments.length === 0) {
      logger.info("✅ No failed deployments to clean up");
      return { cleaned: 0, orphanedRunPodEndpoints: [] };
    }

    logger.info(`🧹 Found ${failedDeployments.length} failed deployments to clean up`);

    const orphanedRunPodEndpoints: string[] = [];

    for (const deployment of failedDeployments) {
      logger.info(`Cleaning up failed deployment ${deployment.id} (${deployment.modelId} in ${deployment.region})`);
      
      if (deployment.runpodEndpointId) {
        orphanedRunPodEndpoints.push(deployment.runpodEndpointId);
        logger.info(`  ⚠️  RunPod endpoint ${deployment.runpodEndpointId} may need manual cleanup`);
      }

      if (!dryRun) {
        await deploymentRepo.delete(deployment.id);
        logger.info(`  ✅ Deleted deployment record`);
      } else {
        logger.info(`  🧪 [DRY RUN] Would delete deployment record`);
      }
    }

    const cleaned = dryRun ? 0 : failedDeployments.length;
    logger.info(`✅ Cleanup completed: ${cleaned} deployments removed`);

    if (orphanedRunPodEndpoints.length > 0) {
      logger.warn(`⚠️  ${orphanedRunPodEndpoints.length} RunPod endpoints may need manual cleanup:`);
      orphanedRunPodEndpoints.forEach(id => logger.warn(`    - ${id}`));
    }

    return { cleaned, orphanedRunPodEndpoints };
  }

  /**
   * Sync deployment status with RunPod API to detect orphaned resources
   */
  async syncWithRunPodAPI(): Promise<{
    synced: number;
    orphanedInRunPod: string[];
    missingInRunPod: string[];
  }> {
    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);

    // Get all deployments that should have RunPod endpoints
    const deployments = await deploymentRepo.find({
      where: {
        runpodEndpointId: { $not: null } as any,
        status: { $in: [DeploymentStatus.RUNNING, DeploymentStatus.DEPLOYING] } as any,
      },
    });

    logger.info(`🔄 Syncing ${deployments.length} deployments with RunPod API`);

    const orphanedInRunPod: string[] = [];
    const missingInRunPod: string[] = [];
    let synced = 0;

    for (const deployment of deployments) {
      if (!deployment.runpodEndpointId) continue;

      try {
        const query = `
          query {
            serverlessEndpoint(id: "${deployment.runpodEndpointId}") {
              id
              name
              status
              url
            }
          }
        `;

        const response = await this.client.post("", { query }).catch((error) => {
          const errorMessage = `RunPod sync request failed for deployment ${deployment.id}: ${error.message}`;
          logger.error(`❌ ${errorMessage}`);
          throw new Error(errorMessage);
        });
        
        if (response.data.errors) {
          // Endpoint not found in RunPod
          missingInRunPod.push(deployment.runpodEndpointId);
          logger.warn(`⚠️  Deployment ${deployment.id} has RunPod endpoint ${deployment.runpodEndpointId} that doesn't exist in RunPod`);
          
          // Mark as failed if it was supposed to be running
          if (deployment.status === DeploymentStatus.RUNNING) {
            await this.updateDeploymentStatus(
              deployment.id,
              DeploymentStatus.FAILED,
              "RunPod endpoint not found - may have been deleted externally"
            );
            logger.info(`  📝 Marked deployment ${deployment.id} as failed`);
          }
        } else {
          const endpoint = response.data.data.serverlessEndpoint;
          if (endpoint) {
            // Update deployment with current status from RunPod
            const updates: Partial<RunPodDeployment> = {};
            
            if (endpoint.url && endpoint.url !== deployment.endpointUrl) {
              updates.endpointUrl = endpoint.url;
            }
            
            if (endpoint.status === "STOPPED" && deployment.status === DeploymentStatus.RUNNING) {
              updates.status = DeploymentStatus.STOPPED;
            }
            
            if (Object.keys(updates).length > 0) {
              await deploymentRepo.update(deployment.id, updates);
              synced++;
              logger.info(`  ✅ Synced deployment ${deployment.id} with RunPod status: ${endpoint.status}`);
            }
          }
        }
      } catch (error) {
        logger.error(`❌ Failed to sync deployment ${deployment.id}:`, error);
      }
    }

    // Check for orphaned RunPod endpoints (endpoints in RunPod but not in our DB)
    try {
      const allRunPodEndpoints = await this.listRunPodEndpoints();
      const ourEndpointIds = new Set(deployments.map(d => d.runpodEndpointId).filter(Boolean));
      
      for (const endpoint of allRunPodEndpoints) {
        if (!ourEndpointIds.has(endpoint.id)) {
          orphanedInRunPod.push(endpoint.id);
        }
      }
    } catch (error) {
      logger.error("Failed to check for orphaned RunPod endpoints:", error);
    }

    logger.info(`🔄 Sync completed:`);
    logger.info(`  ✅ Synced: ${synced} deployments`);
    logger.info(`  ⚠️  Missing in RunPod: ${missingInRunPod.length} endpoints`);
    logger.info(`  ⚠️  Orphaned in RunPod: ${orphanedInRunPod.length} endpoints`);

    return { synced, orphanedInRunPod, missingInRunPod };
  }

  /**
   * Sync RunPod endpoints with our database - create missing deployment records
   */
  private async syncEndpointsWithDatabase(runpodEndpoints: any[]): Promise<void> {
    try {
      logger.info("\n🔄 Checking database synchronization with RunPod endpoints...");

      // Try to access the database - if it fails, we'll catch and handle gracefully
      const deploymentRepo = databaseService
        .getDataSource()
        .getRepository(RunPodDeployment);

      // Get all our existing deployments with RunPod endpoint IDs
      const existingDeployments = await deploymentRepo.find({
        where: {
          runpodEndpointId: { $not: null } as any,
        },
        select: ["id", "runpodEndpointId", "modelId", "region", "status"],
      });

      const existingEndpointIds = new Set(
        existingDeployments.map(d => d.runpodEndpointId).filter(Boolean)
      );

      const missingEndpoints: any[] = [];
      const foundEndpoints: string[] = [];

      // Check each RunPod endpoint against our database
      for (const endpoint of runpodEndpoints) {
        if (existingEndpointIds.has(endpoint.id)) {
          foundEndpoints.push(endpoint.id);
        } else {
          missingEndpoints.push(endpoint);
        }
      }

      logger.info(`✅ Found ${foundEndpoints.length} endpoints already in our database`);
      
      if (missingEndpoints.length > 0) {
        logger.info(`🔄 Found ${missingEndpoints.length} endpoints in RunPod but missing from our database:`);

        for (const endpoint of missingEndpoints) {
          try {
            logger.info(`\n📝 Creating deployment record for: ${endpoint.name} (${endpoint.id})`);
            
            // Extract model and region from endpoint name if possible
            // Expected format: "modelId-region" or "modelId-region-timestamp"
            const { modelId, region } = this.parseEndpointName(endpoint.name);
            
            // Create the deployment record
            const deployment = deploymentRepo.create({
              modelId: modelId || 'unknown',
              region: region || 'unknown',
              status: DeploymentStatus.RUNNING, // Since it exists in RunPod, assume running
              runpodEndpointId: endpoint.id,
              endpointUrl: undefined, // Will be fetched later if needed
              gpuType: 'NVIDIA GeForce RTX 4090', // Default, can be updated later
              minReplicas: endpoint.workersMin || 1,
              maxReplicas: endpoint.workersMax || 3,
              autoScaling: true,
              carbonIntensity: 0.4, // Default value, will be updated based on region
              deploymentCostPerHour: 0.69, // Default RTX 4090 cost, will be updated
              configuration: {
                importedFromRunPod: true,
                originalEndpointName: endpoint.name,
                syncedAt: new Date().toISOString(),
              },
            });

            const savedDeployment = await deploymentRepo.save(deployment);
            logger.info(`✅ Created deployment record: ${savedDeployment.id.substring(0, 8)}...`);
            logger.info(`   Model: ${modelId || 'unknown'}`);
            logger.info(`   Region: ${region || 'unknown'}`);
            logger.info(`   Workers: ${endpoint.workersMin || 1}-${endpoint.workersMax || 3}`);

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`❌ Failed to create deployment record for ${endpoint.name}: ${errorMessage}`);
          }
        }

        logger.info(`\n📊 Database synchronization completed: added ${missingEndpoints.length} new deployment records`);
      } else {
        logger.info("✅ All RunPod endpoints are already tracked in our database");
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle database initialization errors gracefully
      if (errorMessage.includes('Database not initialized') || errorMessage.includes('DataSource is not initialized')) {
        logger.info("⚠️ Database not available - skipping synchronization (this is normal for direct API queries)");
        return;
      }
      
      // Log the actual error for debugging
      logger.error(`❌ Database synchronization failed: ${errorMessage}`);
      logger.error(`🔧 Error details:`);
      logger.error(`   Error type: ${error?.constructor?.name || 'Unknown'}`);
      if (error instanceof Error && error.stack) {
        logger.error(`   Stack trace: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
      }
      logger.error(`   Database initialized: ${databaseService.getDataSource()?.isInitialized || 'Unknown'}`);
      logger.warn("⚠️ Database sync skipped (database not available)");
      
      // Don't throw - this is a nice-to-have feature, not critical
    }
  }

  /**
   * Parse endpoint name to extract model ID and region
   * Expected formats: "modelId-region", "modelId-region-timestamp", etc.
   */
  private parseEndpointName(endpointName: string): { modelId: string | null; region: string | null } {
    try {
      // Common patterns:
      // "llama-3-8b-instruct-US-OR-1"
      // "mistral-7b-EU-SE-1" 
      // "custom-model-US-CA-1-20241201"
      
      const parts = endpointName.split('-');
      
      if (parts.length >= 2) {
        // Look for region pattern (typically XX-XX-X format)
        const regionPattern = /^[A-Z]{2}-[A-Z]{2}-\d+$/;
        let regionIndex = -1;
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (regionPattern.test(part)) {
            regionIndex = i;
            break;
          }
        }
        
        if (regionIndex > 0) {
          const modelParts = parts.slice(0, regionIndex);
          const region = parts[regionIndex];
          
          return {
            modelId: modelParts.join('-'),
            region: region
          };
        }
      }
      
      // Fallback: assume first part is model, look for known regions
      const knownRegions = Object.keys(RUNPOD_REGIONS);
      for (const region of knownRegions) {
        if (endpointName.includes(region)) {
          const modelId = endpointName.replace(region, '').replace(/[-_]+/g, '-').replace(/^-|-$/g, '');
          return { modelId, region };
        }
      }
      
      return { modelId: null, region: null };
      
    } catch (error) {
      logger.warn(`⚠️ Failed to parse endpoint name "${endpointName}": ${error}`);
      return { modelId: null, region: null };
    }
  }

  /**
   * Comprehensive cleanup and sync operation
   */
  async performMaintenance(options: {
    cleanupFailedOlderThanHours?: number;
    syncWithRunPod?: boolean;
    dryRun?: boolean;
  } = {}): Promise<{
    cleanup: { cleaned: number; orphanedRunPodEndpoints: string[] };
    sync: { synced: number; orphanedInRunPod: string[]; missingInRunPod: string[] };
  }> {
    logger.info("🔧 Starting RunPod deployment maintenance...");

    const cleanup = await this.cleanupFailedDeployments({
      olderThanHours: options.cleanupFailedOlderThanHours || 24,
      dryRun: options.dryRun || false,
    });

    let sync: { synced: number; orphanedInRunPod: string[]; missingInRunPod: string[] } = { 
      synced: 0, 
      orphanedInRunPod: [], 
      missingInRunPod: [] 
    };
    if (options.syncWithRunPod !== false) {
      sync = await this.syncWithRunPodAPI();
    }

    logger.info("🔧 RunPod deployment maintenance completed");
    return { cleanup, sync };
  }
}

export const runPodService = new RunPodService();
export { RunPodService };
