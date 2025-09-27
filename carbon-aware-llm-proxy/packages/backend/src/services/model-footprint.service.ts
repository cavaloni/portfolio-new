import { logger } from "../utils/logger";
import { redisService } from "./redis.service";
import { supabaseService } from "./supabase.service";

// Cache TTL in seconds
const CACHE_TTL = {
  MODEL_FOOTPRINT: 3600, // 1 hour
  MODEL_LIST: 1800, // 30 minutes
  PROVIDER_MODELS: 1800, // 30 minutes
};

class ModelFootprintService {
  constructor() {}

  // Get all models with pagination
  async getAllModels(page: number = 1, limit: number = 20) {
    const cacheKey = `models:all:${page}:${limit}`;

    return redisService.withCache(
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;
        const { data, count } = await supabaseService.getModelsWithCount({
          limit,
          offset: skip,
        });

        return {
          data: data || [],
          meta: {
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil(((count || 0) as number) / limit),
          },
        };
      },
      CACHE_TTL.MODEL_LIST,
    );
  }

  // Get models by provider
  async getModelsByProvider(
    provider: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const cacheKey = `models:provider:${provider}:${page}:${limit}`;

    return redisService.withCache(
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;
        const { data, count } = await supabaseService.getModelsWithCount({
          provider,
          limit,
          offset: skip,
        });

        return {
          data: data || [],
          meta: {
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil(((count || 0) as number) / limit),
          },
        };
      },
      CACHE_TTL.PROVIDER_MODELS,
    );
  }

  // Get model by ID
  async getModelById(id: string) {
    const cacheKey = `model:${id}`;

    return redisService.withCache(
      cacheKey,
      () => supabaseService.getModelById(id),
      CACHE_TTL.MODEL_FOOTPRINT,
    );
  }

  // Create or update model footprint data
  async upsertModelFootprint(modelData: {
    name: string;
    provider: string;
    architecture: string;
    parameters: number;
    flopsPerToken: number;
    carbonIntensity: { min: number; avg: number; max: number };
    hardware: string;
    region: string;
    source: string;
    publishedDate?: Date;
  }) {
    logger.warn(
      "upsertModelFootprint in Supabase mode expects model to already exist in model_info",
    );

    const client = supabaseService.getClient();
    const { data: modelRecord, error: modelErr } = await client
      .from("model_info")
      .select("*")
      .eq("provider", modelData.provider)
      .eq("name", modelData.name)
      .maybeSingle();

    if (modelErr && modelErr.code !== "PGRST116") {
      logger.error("Error looking up model in Supabase:", modelErr);
      throw new Error("Failed to upsert model footprint: model lookup failed");
    }
    if (!modelRecord) {
      throw new Error(
        `Model ${modelData.provider}/${modelData.name} not found in Supabase`,
      );
    }

    const { data: existing, error: fpErr } = await client
      .from("carbon_footprints")
      .select("*")
      .eq("model_id", modelRecord.id)
      .eq("region", modelData.region)
      .eq("hardware", modelData.hardware)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fpErr && fpErr.code !== "PGRST116") {
      logger.error("Error checking existing footprint:", fpErr);
      throw new Error("Failed to upsert model footprint: lookup failed");
    }

    const payload: any = {
      model_id: modelRecord.id,
      region: modelData.region,
      hardware: modelData.hardware,
      carbon_intensity_min: modelData.carbonIntensity.min,
      carbon_intensity_avg: modelData.carbonIntensity.avg,
      carbon_intensity_max: modelData.carbonIntensity.max,
      source: modelData.source,
      model_name: modelData.name,
      provider: modelData.provider,
    };

    if (existing) {
      const { data, error } = await client
        .from("carbon_footprints")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) {
        logger.error("Failed updating carbon footprint:", error);
        throw new Error("Failed to update model footprint data");
      }
      await this.invalidateModelCaches(modelRecord.id, modelData.provider);
      return { model: modelRecord, footprint: data };
    } else {
      const { data, error } = await client
        .from("carbon_footprints")
        .insert(payload)
        .select("*")
        .single();
      if (error) {
        logger.error("Failed inserting carbon footprint:", error);
        throw new Error("Failed to create model footprint data");
      }
      await this.invalidateModelCaches(modelRecord.id, modelData.provider);
      return { model: modelRecord, footprint: data };
    }
  }

  // Delete a model and its footprints
  async deleteModel(modelId: string) {
    try {
      const model: any = await supabaseService.getModelById(modelId);
      await supabaseService.deleteCarbonFootprintsByModelId(modelId);
      await supabaseService.deleteModelInfo(modelId);
      if (model) {
        await this.invalidateModelCaches(modelId, model.provider);
      }
      return true;
    } catch (error) {
      logger.error("Failed to delete model (Supabase):", error);
      throw new Error("Failed to delete model");
    }
  }

  // Get carbon footprint for a specific model and region
  async getModelFootprint(modelId: string, region?: string) {
    const cacheKey = `footprint:${modelId}:${region || "global"}`;

    return redisService.withCache(
      cacheKey,
      async () => {
        const client = supabaseService.getClient();

        if (region) {
          const fp = await supabaseService.getCarbonFootprintByModelAndRegion(
            modelId,
            region,
          );
          if (!fp) return null;
          // Map to camelCase expected by routing.service.ts
          return {
            model: await supabaseService.getModelById(modelId),
            carbonIntensityMin: fp.carbon_intensity_min ?? fp.intensity ?? 0,
            carbonIntensityAvg: fp.carbon_intensity_avg ?? fp.intensity ?? 0,
            carbonIntensityMax: fp.carbon_intensity_max ?? fp.intensity ?? 0,
            region: fp.region,
            source: fp.source || null,
            hardware: fp.hardware || null,
            energy: fp.energy ?? null,
          } as any;
        }

        // No region: aggregate all footprints for this model
        const { data: rows, error } = await client
          .from("carbon_footprints")
          .select("*")
          .eq("model_id", modelId);
        if (error) {
          logger.error("Error fetching footprints for aggregation:", error);
          throw error;
        }
        if (!rows || rows.length === 0) return null;

        const sum = rows.reduce(
          (acc: any, r: any) => {
            const min = r.carbon_intensity_min ?? r.intensity ?? 0;
            const avg = r.carbon_intensity_avg ?? r.intensity ?? 0;
            const max = r.carbon_intensity_max ?? r.intensity ?? 0;
            acc.min += Number(min) || 0;
            acc.avg += Number(avg) || 0;
            acc.max += Number(max) || 0;
            acc.count += 1;
            return acc;
          },
          { min: 0, avg: 0, max: 0, count: 0 },
        );

        return {
          model: await supabaseService.getModelById(modelId),
          carbonIntensityMin: sum.count ? sum.min / sum.count : 0,
          carbonIntensityAvg: sum.count ? sum.avg / sum.count : 0,
          carbonIntensityMax: sum.count ? sum.max / sum.count : 0,
          region: "global",
          source: "average",
        } as any;
      },
      CACHE_TTL.MODEL_FOOTPRINT,
    );
  }

  // Get models sorted by carbon efficiency (lowest carbon per token first)
  async getModelsByEfficiency(limit: number = 10, region?: string) {
    const cacheKey = `models:efficiency:${region || "global"}:${limit}`;

    return redisService.withCache(
      cacheKey,
      async () => {
        const models = (await supabaseService.getModels({ isActive: true, limit: limit * 3 })) || [];
        const scored: Array<any> = [];
        for (const m of models) {
          const fp = await this.getModelFootprint(m.id, region || undefined);
          if (!fp) continue;
          scored.push({ model: m, score: fp.carbonIntensityAvg });
        }
        scored.sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity));
        return scored.slice(0, limit).map((s) => s.model);
      },
      CACHE_TTL.MODEL_LIST,
    );
  }

  // Invalidate caches related to a model
  private async invalidateModelCaches(modelId: string, provider: string) {
    const cacheKeys = [
      `model:${modelId}`,
      `footprint:${modelId}:*`,
      "models:all:*",
      `models:provider:${provider}:*`,
      "models:efficiency:*",
    ];

    try {
      // This is a simplified approach - in a real Redis setup, you'd use SCAN and MATCH
      // to find and delete matching keys
      await Promise.all(
        cacheKeys.map((key) =>
          redisService
            .del(key)
            .catch((err) =>
              logger.error(`Failed to invalidate cache key ${key}:`, err),
            ),
        ),
      );
    } catch (error) {
      logger.error("Error invalidating model caches:", error);
    }
  }
}

export const modelFootprintService = new ModelFootprintService();
