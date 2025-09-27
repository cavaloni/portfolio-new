import { modelFootprintService } from "./model-footprint.service";
import { carbonService } from "./carbon.service";
import { logger } from "../utils/logger";
import { redisService } from "./redis.service";
import { supabaseService } from "./supabase.service";

interface UserPreferences {
  weights?: {
    carbonEfficiency: number;
    performance: number;
    cost: number;
  };
  preferredProviders?: string[];
  carbonAware?: boolean;
  costSensitive?: boolean;
}

// Default weights for the routing algorithm
const DEFAULT_WEIGHTS = {
  carbonEfficiency: 0.6, // Weight for carbon efficiency (0-1)
  performance: 0.3, // Weight for model performance (0-1)
  cost: 0.1, // Weight for cost (0-1)
};

// Cache TTL in seconds
const ROUTING_CACHE_TTL = 300; // 5 minutes

class RoutingService {
  // Get the best model based on user preferences and current conditions
  async getOptimalModel(
    options: {
      userId?: string;
      region?: string;
      requiredCapabilities?: string[];
      preferredProviders?: string[];
      weights?: {
        carbonEfficiency?: number;
        performance?: number;
        cost?: number;
      };
    } = {},
  ) {
    const {
      userId,
      region,
      requiredCapabilities = [],
      preferredProviders = [],
      weights = {},
    } = options;

    // Get user preferences if userId is provided
    let userPreferences = userId ? await this.getUserPreferences(userId) : null;

    // Merge weights with defaults and user preferences
    const effectiveWeights = this.calculateEffectiveWeights({
      ...DEFAULT_WEIGHTS,
      ...(userPreferences?.weights || {}),
      ...weights,
    });

    // Get all available models that match the required capabilities
    const models = await this.getEligibleModels({
      requiredCapabilities,
      preferredProviders: preferredProviders.length
        ? preferredProviders
        : userPreferences?.preferredProviders || [],
    });

    if (models.length === 0) {
      throw new Error("No models available with the required capabilities");
    }

    // Get current carbon intensity for the region
    const carbonIntensity = region
      ? await carbonService.getCarbonIntensity(region)
      : null;

    // Score each model
    const scoredModels = await Promise.all(
      models.map(async (model) => {
        const footprint = await modelFootprintService.getModelFootprint(
          model.id,
          region || undefined,
        );

        if (!footprint) {
          logger.warn(`No footprint data available for model ${model.name}`);
          return null;
        }

        // Calculate scores (0-1, higher is better)
        const carbonScore = this.calculateCarbonScore(
          footprint,
          carbonIntensity,
        );
        const performanceScore = this.calculatePerformanceScore(model);
        const costScore = this.calculateCostScore(model);

        // Calculate weighted score
        const weightedScore =
          carbonScore * effectiveWeights.carbonEfficiency +
          performanceScore * effectiveWeights.performance +
          costScore * effectiveWeights.cost;

        return {
          model,
          footprint,
          scores: {
            carbon: carbonScore,
            performance: performanceScore,
            cost: costScore,
            total: weightedScore,
          },
          metrics: {
            carbonPerToken: footprint.carbonIntensityAvg / 1e6, // Convert to gCO2eq/token
            tokensPerSecond: Number((model as any).tokens_per_second ?? (model as any).tokensPerSecond ?? null),
            costPer1kTokens: Number((model as any).cost_per_1k_tokens ?? (model as any).costPer1kTokens ?? null),
          },
        };
      }),
    );

    // Filter out nulls and sort by total score (descending)
    const validScoredModels = scoredModels
      .filter(Boolean)
      .sort((a, b) => b!.scores.total - a!.scores.total);

    return validScoredModels[0]?.model || null;
  }

  // Get eligible models based on required capabilities and preferred providers (Supabase)
  private async getEligibleModels(options: {
    requiredCapabilities: string[];
    preferredProviders: string[];
  }): Promise<any[]> {
    const { requiredCapabilities, preferredProviders } = options;

    // Strategy: fetch a wider set (active models) then filter in-memory for multi-capability/provider
    const base = (await supabaseService.getModels({ isActive: true })) || [];

    const providerFiltered = preferredProviders && preferredProviders.length
      ? base.filter((m: any) => preferredProviders.includes((m.provider as string) || ""))
      : base;

    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      return providerFiltered;
    }

    return providerFiltered.filter((m: any) => {
      const caps: string[] = (m.capabilities as string[]) || [];
      // ensure model includes all required capabilities
      return requiredCapabilities.every((c) => caps.includes(c));
    });
  }

  // Calculate carbon score (0-1, higher is better)
  private calculateCarbonScore(
    footprint: { carbonIntensityAvg: number },
    currentIntensity: number | null,
  ): number {
    // If we have current carbon intensity, use it; otherwise use the model's average
    const maxIntensity = 1000; // gCO2eq/kWh
    const intensity =
      currentIntensity !== null
        ? currentIntensity
        : footprint.carbonIntensityAvg;

    // Normalize to 0-1 range (lower intensity is better)
    return Math.max(0, 1 - intensity / maxIntensity);
  }

  // Calculate performance score (0-1, higher is better)
  private calculatePerformanceScore(model: any): number {
    // Base score on tokens per second (normalized to 0-1)
    // Assume a reasonable range for tokens per second (e.g., 1 to 1000)
    const minTps = 1;
    const maxTps = 1000;

    const tps = Number((model as any).tokens_per_second ?? (model as any).tokensPerSecond ?? 0) || 0;
    const tpsScore = (tps - minTps) / (maxTps - minTps);

    // Cap the score between 0 and 1
    return Math.max(0, Math.min(1, tpsScore));
  }

  // Calculate cost score (lower cost is better, so we invert it)
  private calculateCostScore(model: any): number {
    // Normalize cost to a 0-1 scale where 0 is the most expensive and 1 is the cheapest
    // We'll assume a reasonable range for cost (e.g., $0.0005 to $0.20 per 1k tokens)
    const minCost = 0.0005;
    const maxCost = 0.2;

    const cost = Number((model as any).cost_per_1k_tokens ?? (model as any).costPer1kTokens ?? 0) || 0;

    // Invert and normalize the cost
    return Math.max(0, Math.min(1, 1 - (cost - minCost) / (maxCost - minCost)));
  }

  // Public method to get user preferences (for controllers)
  async getUserPreferencesPublic(userId: string) {
    return this.getUserPreferences(userId);
  }

  // Get user preferences from the database
  private async getUserPreferences(
    userId: string,
  ): Promise<UserPreferences | null> {
    try {
      // In a real implementation, this would fetch from the database
      // For now, return some mock data
      return {
        weights: {
          carbonEfficiency: 0.7,
          performance: 0.2,
          cost: 0.1,
        },
        preferredProviders: ["openai", "anthropic"],
        carbonAware: true,
        costSensitive: false,
      };
    } catch (error) {
      logger.error(`Error getting user preferences for user ${userId}:`, error);
      return null;
    }
  }

  // Calculate effective weights based on user preferences and overrides
  private calculateEffectiveWeights(weights: {
    carbonEfficiency?: number;
    performance?: number;
    cost?: number;
  }): { carbonEfficiency: number; performance: number; cost: number } {
    // Normalize weights to sum to 1
    const sum =
      (weights.carbonEfficiency || 0) +
        (weights.performance || 0) +
        (weights.cost || 0) || 1; // Avoid division by zero

    return {
      carbonEfficiency: (weights.carbonEfficiency || 0) / sum,
      performance: (weights.performance || 0) / sum,
      cost: (weights.cost || 0) / sum,
    };
  }

  // Update user preferences
  async updateUserPreferences(
    userId: string,
    updates: Partial<UserPreferences>,
  ): Promise<boolean> {
    try {
      // In a real implementation, this would update the database
      // For now, just log the update
      logger.info(`Updating preferences for user ${userId}:`, updates);
      return true;
    } catch (error) {
      logger.error(`Error updating preferences for user ${userId}:`, error);
      return false;
    }
  }

  // Get model recommendations for a user
  async getModelRecommendations(
    userId: string,
    region?: string,
  ): Promise<
    Array<{
      model: any;
      score: number;
      metrics: {
        carbonPerToken: number;
        tokensPerSecond: number | null;
        costPer1kTokens: number | null;
      };
    }>
  > {
    try {
      const userPreferences = await this.getUserPreferences(userId);

      // Get the optimal model and its score
      const optimalModel = await this.getOptimalModel({
        userId,
        region,
        weights: userPreferences?.weights,
        preferredProviders: userPreferences?.preferredProviders,
      });

      if (!optimalModel) {
        return [];
      }

      // Get the footprint for the optimal model
      const footprint = await modelFootprintService.getModelFootprint(
        optimalModel.id,
        region,
      );

      if (!footprint) {
        return [];
      }

      // Return the optimal model with its score and metrics
      return [
        {
          model: optimalModel,
          score: 1.0, // This would be calculated based on the scoring algorithm
          metrics: {
            carbonPerToken: footprint.carbonIntensityAvg / 1e6,
            tokensPerSecond: Number((optimalModel as any).tokens_per_second ?? (optimalModel as any).tokensPerSecond ?? null),
            costPer1kTokens: Number((optimalModel as any).cost_per_1k_tokens ?? (optimalModel as any).costPer1kTokens ?? null),
          },
        },
      ];
    } catch (error) {
      logger.error("Error getting model recommendations:", error);
      return [];
    }
  }

  // Calculate the carbon footprint of a model invocation
  async calculateCarbonFootprint(
    modelId: string,
    region?: string,
    tokenCount: number = 1000,
  ): Promise<{
    carbonGrams: number;
    costDollars: number;
    durationSeconds: number;
    model: any;
  } | null> {
    try {
      // Get the model via Supabase
      const model = await supabaseService.getModelById(modelId);
      if (!model) {
        return null;
      }

      // Get the carbon intensity for the region
      const carbonIntensity = region
        ? await carbonService.getCarbonIntensity(region)
        : null;

      // Get the footprint data
      const footprint = await modelFootprintService.getModelFootprint(
        modelId,
        region || undefined,
      );
      if (!footprint) {
        return null;
      }

      // Use current carbon intensity if available, otherwise use the model's average
      const intensity =
        carbonIntensity !== null
          ? carbonIntensity
          : footprint.carbonIntensityAvg;

      // Calculate carbon emissions using proper formula
      // Estimate energy usage per token (Wh) and convert to kWh, then multiply by intensity
      const energyPerTokenWh = 'energy' in footprint ? (footprint.energy * 1000) / tokenCount : (intensity / 300); // Wh per token
      const energyKwh = (energyPerTokenWh * tokenCount) / 1000; // Convert to kWh
      const carbonGrams = energyKwh * intensity; // gCO2e = kWh * gCO2e/kWh

      // Calculate cost
      const costPer1k = Number((model as any).cost_per_1k_tokens ?? (model as any).costPer1kTokens ?? 0) || 0;
      const costDollars = (tokenCount / 1000) * costPer1k;

      // Calculate duration (simplified)
      const tps = Number((model as any).tokens_per_second ?? (model as any).tokensPerSecond ?? 1) || 1;
      const durationSeconds = tokenCount / tps;

      return {
        carbonGrams,
        costDollars,
        durationSeconds,
        model,
      };
    } catch (error) {
      logger.error("Error calculating carbon footprint:", error);
      return null;
    }
  }
}

export const routingService = new RoutingService();
