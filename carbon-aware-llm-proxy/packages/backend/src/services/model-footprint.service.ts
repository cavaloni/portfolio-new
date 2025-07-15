import { Repository } from 'typeorm';
import { ModelInfo } from '../entities/ModelInfo';
import { CarbonFootprint } from '../entities/CarbonFootprint';
import { databaseService } from './database.service';
import { logger } from '../utils/logger';
import { redisService } from './redis.service';

// Cache TTL in seconds
const CACHE_TTL = {
  MODEL_FOOTPRINT: 3600, // 1 hour
  MODEL_LIST: 1800, // 30 minutes
  PROVIDER_MODELS: 1800, // 30 minutes
};

class ModelFootprintService {
  private modelRepository!: Repository<ModelInfo>;
  private carbonFootprintRepository!: Repository<CarbonFootprint>;

  constructor() {
    this.initializeRepositories();
  }

  private initializeRepositories() {
    this.modelRepository = databaseService.getDataSource().getRepository(ModelInfo);
    this.carbonFootprintRepository = databaseService.getDataSource().getRepository(CarbonFootprint);
  }

  // Get all models with pagination
  async getAllModels(page: number = 1, limit: number = 20) {
    const cacheKey = `models:all:${page}:${limit}`;
    
    return redisService.withCache(
      cacheKey,
      async () => {
        const [models, total] = await this.modelRepository.findAndCount({
          relations: ['carbonFootprints'],
          order: { name: 'ASC' },
          skip: (page - 1) * limit,
          take: limit,
        });

        return {
          data: models,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      CACHE_TTL.MODEL_LIST
    );
  }

  // Get models by provider
  async getModelsByProvider(provider: string, page: number = 1, limit: number = 20) {
    const cacheKey = `models:provider:${provider}:${page}:${limit}`;
    
    return redisService.withCache(
      cacheKey,
      async () => {
        const [models, total] = await this.modelRepository.findAndCount({
          where: { provider },
          relations: ['carbonFootprints'],
          order: { name: 'ASC' },
          skip: (page - 1) * limit,
          take: limit,
        });

        return {
          data: models,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      CACHE_TTL.PROVIDER_MODELS
    );
  }

  // Get model by ID
  async getModelById(id: string) {
    const cacheKey = `model:${id}`;
    
    return redisService.withCache(
      cacheKey,
      () => this.modelRepository.findOne({
        where: { id },
        relations: ['carbonFootprints'],
      }),
      CACHE_TTL.MODEL_FOOTPRINT
    );
  }

  // Create or update model footprint data
  async upsertModelFootprint(modelData: {
    name: string;
    provider: string;
    architecture: string;
    parameters: number;
    flopsPerToken: number;
    carbonIntensity: {
      min: number;
      avg: number;
      max: number;
    };
    hardware: string;
    region: string;
    source: string;
    publishedDate?: Date;
  }) {
    const queryRunner = databaseService.getDataSource().createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find existing model or create a new one
      let model = await this.modelRepository.findOne({
        where: {
          name: modelData.name,
          provider: modelData.provider,
        },
      });

      if (!model) {
        model = this.modelRepository.create({
          name: modelData.name,
          provider: modelData.provider,
          architecture: modelData.architecture,
          parameters: modelData.parameters,
          flopsPerToken: modelData.flopsPerToken,
          publishedDate: modelData.publishedDate || new Date(),
        });
      } else {
        // Update model details if needed
        model.architecture = modelData.architecture || model.architecture;
        model.parameters = modelData.parameters || model.parameters;
        model.flopsPerToken = modelData.flopsPerToken || model.flopsPerToken;
        model.publishedDate = modelData.publishedDate || model.publishedDate;
      }

      // Save the model
      await queryRunner.manager.save(ModelInfo, model);

      // Create or update carbon footprint
      let footprint = await this.carbonFootprintRepository.findOne({
        where: {
          model: { id: model.id },
          hardware: modelData.hardware,
          region: modelData.region,
        },
      });

      if (!footprint) {
        footprint = this.carbonFootprintRepository.create({
          model,
          hardware: modelData.hardware,
          region: modelData.region,
          carbonIntensityMin: modelData.carbonIntensity.min,
          carbonIntensityAvg: modelData.carbonIntensity.avg,
          carbonIntensityMax: modelData.carbonIntensity.max,
          source: modelData.source,
        });
      } else {
        footprint.carbonIntensityMin = modelData.carbonIntensity.min;
        footprint.carbonIntensityAvg = modelData.carbonIntensity.avg;
        footprint.carbonIntensityMax = modelData.carbonIntensity.max;
        footprint.source = modelData.source;
      }

      await queryRunner.manager.save(CarbonFootprint, footprint);
      await queryRunner.commitTransaction();

      // Invalidate relevant caches
      await this.invalidateModelCaches(model.id, model.provider);

      return {
        model,
        footprint,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to upsert model footprint:', error);
      throw new Error('Failed to update model footprint data');
    } finally {
      await queryRunner.release();
    }
  }

  // Delete a model and its footprints
  async deleteModel(modelId: string) {
    const queryRunner = databaseService.getDataSource().createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get model to get provider for cache invalidation
      const model = await this.modelRepository.findOne({
        where: { id: modelId },
      });

      if (!model) {
        throw new Error('Model not found');
      }

      // Delete footprints first due to foreign key constraint
      await queryRunner.manager.delete(CarbonFootprint, { model: { id: modelId } });
      
      // Delete the model
      await queryRunner.manager.delete(ModelInfo, { id: modelId });
      
      await queryRunner.commitTransaction();

      // Invalidate caches
      if (model) {
        await this.invalidateModelCaches(modelId, model.provider);
      }

      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to delete model:', error);
      throw new Error('Failed to delete model');
    } finally {
      await queryRunner.release();
    }
  }

  // Get carbon footprint for a specific model and region
  async getModelFootprint(modelId: string, region?: string) {
    const cacheKey = `footprint:${modelId}:${region || 'global'}`;
    
    return redisService.withCache(
      cacheKey,
      async () => {
        const query = this.carbonFootprintRepository
          .createQueryBuilder('footprint')
          .leftJoinAndSelect('footprint.model', 'model')
          .where('footprint.modelId = :modelId', { modelId });

        if (region) {
          query.andWhere('footprint.region = :region', { region });
        } else {
          // If no region is specified, get the global average
          query.orderBy('footprint.region', 'ASC');
        }

        const footprints = await query.getMany();

        if (footprints.length === 0) {
          return null;
        }

        // If a specific region was requested, return that footprint
        if (region) {
          return footprints[0];
        }

        // Otherwise, calculate the average across all regions
        const total = footprints.reduce(
          (acc, curr) => {
            return {
              carbonIntensityMin: acc.carbonIntensityMin + curr.carbonIntensityMin,
              carbonIntensityAvg: acc.carbonIntensityAvg + curr.carbonIntensityAvg,
              carbonIntensityMax: acc.carbonIntensityMax + curr.carbonIntensityMax,
              count: acc.count + 1,
            };
          },
          { carbonIntensityMin: 0, carbonIntensityAvg: 0, carbonIntensityMax: 0, count: 0 }
        );

        return {
          model: footprints[0].model,
          carbonIntensityMin: total.carbonIntensityMin / total.count,
          carbonIntensityAvg: total.carbonIntensityAvg / total.count,
          carbonIntensityMax: total.carbonIntensityMax / total.count,
          region: 'global',
          source: 'average',
        };
      },
      CACHE_TTL.MODEL_FOOTPRINT
    );
  }

  // Get models sorted by carbon efficiency (lowest carbon per token first)
  async getModelsByEfficiency(limit: number = 10, region?: string) {
    const cacheKey = `models:efficiency:${region || 'global'}:${limit}`;
    
    return redisService.withCache(
      cacheKey,
      async () => {
        // This is a simplified query - in a real app, you'd want to join with the footprints table
        // and filter by region if specified
        const query = this.modelRepository
          .createQueryBuilder('model')
          .leftJoinAndSelect('model.carbonFootprints', 'footprint')
          .orderBy('footprint.carbonIntensityAvg', 'ASC')
          .addOrderBy('model.flopsPerToken', 'ASC')
          .take(limit);

        if (region) {
          query.where('footprint.region = :region', { region });
        }

        return query.getMany();
      },
      CACHE_TTL.MODEL_LIST
    );
  }

  // Invalidate caches related to a model
  private async invalidateModelCaches(modelId: string, provider: string) {
    const cacheKeys = [
      `model:${modelId}`,
      `footprint:${modelId}:*`,
      'models:all:*',
      `models:provider:${provider}:*`,
      'models:efficiency:*',
    ];

    try {
      // This is a simplified approach - in a real Redis setup, you'd use SCAN and MATCH
      // to find and delete matching keys
      await Promise.all(
        cacheKeys.map(key => 
          redisService.del(key).catch(err => 
            logger.error(`Failed to invalidate cache key ${key}:`, err)
          )
        )
      );
    } catch (error) {
      logger.error('Error invalidating model caches:', error);
    }
  }
}

export const modelFootprintService = new ModelFootprintService();
