import { logger } from "../utils/logger";
import { supabaseService } from "./supabase.service";
class ModelService {
  constructor() {}

  async getAllModels(
    filters: {
      provider?: string;
      capability?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { provider, capability, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const { data, count } = await supabaseService.getModelsWithCount({
      provider,
      capability,
      search,
      limit,
      offset: skip,
    });

    return {
      data: data || [],
      meta: {
        total: count || 0,
        page,
        totalPages: Math.ceil(((count || 0) as number) / limit),
        limit,
      },
    };
  }

  async getModelById(id: string) {
    return await supabaseService.getModelById(id);
  }

  async getModelByProviderId(provider: string, modelId: string) {
    return await supabaseService.getModelByProviderAndId(provider, modelId);
  }

  async createModel(data: Record<string, any>) {
    const mapped: any = {
      ...data,
      // camelCase to snake_case mappings
      context_window: (data as any).contextWindow,
      max_tokens: (data as any).maxTokens,
      training_data: (data as any).trainingData,
      knowledge_cutoff: (data as any).knowledgeCutoff,
      flops_per_token: (data as any).flopsPerToken,
      energy_per_token: (data as any).energyPerToken,
      tokens_per_second: (data as any).tokensPerSecond,
      cost_per_1k_tokens: (data as any).costPer1kTokens,
      is_recommended: (data as any).isRecommended,
      is_active: (data as any).isActive,
      last_updated: (data as any).lastUpdated,
      published_date: (data as any).publishedDate,
    };
    // Remove undefined values to avoid overwriting with null unintentionally
    Object.keys(mapped).forEach((k) =>
      mapped[k] === undefined ? delete mapped[k] : null,
    );
    return await supabaseService.createModelInfo(mapped);
  }

  async updateModel(id: string, updates: Record<string, any>) {
    const mapped: any = {
      ...updates,
      context_window: (updates as any).contextWindow,
      max_tokens: (updates as any).maxTokens,
      training_data: (updates as any).trainingData,
      knowledge_cutoff: (updates as any).knowledgeCutoff,
      flops_per_token: (updates as any).flopsPerToken,
      energy_per_token: (updates as any).energyPerToken,
      tokens_per_second: (updates as any).tokensPerSecond,
      cost_per_1k_tokens: (updates as any).costPer1kTokens,
      is_recommended: (updates as any).isRecommended,
      is_active: (updates as any).isActive,
      last_updated: (updates as any).lastUpdated,
      published_date: (updates as any).publishedDate,
    };
    Object.keys(mapped).forEach((k) =>
      mapped[k] === undefined ? delete mapped[k] : null,
    );
    await supabaseService.updateModelInfo(id, mapped);
    return await this.getModelById(id);
  }

  async deleteModel(id: string) {
    await supabaseService.deleteModelInfo(id);
    return true;
  }

  async getModelCarbonFootprint(modelId: string, region?: string) {
    return await supabaseService.getCarbonFootprintByModelAndRegion(
      modelId,
      region,
    );
  }

  async updateModelCarbonFootprint(
    modelId: string,
    data: {
      region: string;
      emissions: number;
      energy: number;
      intensity?: number;
      modelName?: string;
      provider?: string;
    },
  ) {
    const { region, emissions, energy, intensity, modelName, provider } = data;

    // Ensure model exists
    const model = await supabaseService.getModelById(modelId);
    if (!model) throw new Error(`Model with ID ${modelId} not found`);

    const existing = await supabaseService.getCarbonFootprintByModelAndRegion(
      modelId,
      region,
    );

    if (existing) {
      return await supabaseService.updateCarbonFootprint(existing.id, {
        emissions,
        energy,
        ...(intensity !== undefined ? { intensity } : {}),
        ...(modelName ? { model_name: modelName } : {}),
        ...(provider ? { provider } : {}),
      });
    } else {
      return await supabaseService.createCarbonFootprint({
        model_id: modelId,
        region,
        emissions,
        energy,
        intensity: intensity,
        model_name: modelName || model.name,
        provider: provider || model.provider,
      });
    }
  }

  async getRecommendedModels(
    capability: string,
    region?: string,
    limit: number = 5,
  ) {
    // Fetch by capability and sort by carbon intensity if region provided
    const models =
      (await supabaseService.getModels({ capability, isActive: true, limit })) || [];

    if (region) {
      // Prefer lower carbon_intensity.avg
      models.sort(
        (a: any, b: any) =>
          (a?.carbon_intensity?.avg ?? Number.POSITIVE_INFINITY) -
          (b?.carbon_intensity?.avg ?? Number.POSITIVE_INFINITY),
      );
    }

    return models.slice(0, limit);
  }

  async syncWithProvider(
    provider: string,
    models: Array<{
      providerModelId: string;
      name: string;
      description?: string;
      contextWindow?: number;
      maxOutputTokens?: number;
      capabilities?: string[];
      isActive?: boolean;
    }>,
  ) {
    try {
      // Get existing models for this provider
      const existingModels =
        (await supabaseService.getModels({ provider })) || [];

      const processedIds = new Set<string>();
      const results = {
        created: 0,
        updated: 0,
        deactivated: 0,
      };

      for (const modelData of models) {
        const { providerModelId, ...modelProps } = modelData;
        const modelId = `${provider}:${providerModelId}`;

        const existing = await supabaseService.getModelById(modelId);
        const mapped: any = {
          id: modelId,
          provider,
          provider_model_id: providerModelId,
          ...modelProps,
          is_active: true,
          updated_at: new Date().toISOString(),
        };

        // Snake-case mapping for known fields in modelProps
        if ((modelProps as any).contextWindow !== undefined)
          mapped.context_window = (modelProps as any).contextWindow;
        if ((modelProps as any).maxTokens !== undefined)
          mapped.max_tokens = (modelProps as any).maxTokens;
        if ((modelProps as any).flopsPerToken !== undefined)
          mapped.flops_per_token = (modelProps as any).flopsPerToken;
        if ((modelProps as any).energyPerToken !== undefined)
          mapped.energy_per_token = (modelProps as any).energyPerToken;
        if ((modelProps as any).tokensPerSecond !== undefined)
          mapped.tokens_per_second = (modelProps as any).tokensPerSecond;
        if ((modelProps as any).costPer1kTokens !== undefined)
          mapped.cost_per_1k_tokens = (modelProps as any).costPer1kTokens;

        if (existing) {
          await supabaseService.updateModelInfo(modelId, mapped);
          results.updated++;
        } else {
          mapped.created_at = new Date().toISOString();
          await supabaseService.createModelInfo(mapped);
          results.created++;
        }

        processedIds.add(providerModelId);
      }

      // Deactivate models that weren't in the sync data
      for (const model of existingModels) {
        const pmid = (model as any).provider_model_id || (model as any).providerModelId;
        if (!processedIds.has(pmid) && model.is_active !== false) {
          await supabaseService.updateModelInfo(model.id, {
            is_active: false,
            updated_at: new Date().toISOString(),
          });
          results.deactivated++;
        }
      }

      return results;
    } catch (error) {
      logger.error("Error syncing models with provider:", error);
      throw new Error("Failed to sync models with provider");
    }
  }
}

export const modelService = new ModelService();
