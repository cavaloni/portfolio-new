import { In, Like, Repository } from 'typeorm';
import { databaseService } from './database.service';
import { ModelInfo } from '../entities/ModelInfo';
import { logger } from '../utils/logger';
import { CarbonFootprint } from '../entities/CarbonFootprint';

class ModelService {
  private modelRepository!: Repository<ModelInfo>;
  private carbonFootprintRepository!: Repository<CarbonFootprint>;

  constructor() {
    this.initializeRepositories();
  }

  private initializeRepositories() {
    this.modelRepository = databaseService.getDataSource().getRepository(ModelInfo);
    this.carbonFootprintRepository = databaseService.getDataSource().getRepository(CarbonFootprint);
  }

  async getAllModels(filters: {
    provider?: string;
    capability?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { provider, capability, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    
    const query = this.modelRepository.createQueryBuilder('model');
    
    // Apply filters
    if (provider) {
      query.andWhere('model.provider = :provider', { provider });
    }
    
    if (capability) {
      query.andWhere(':capability = ANY(model.capabilities)', { capability });
    }
    
    if (search) {
      query.andWhere(`(
        model.name ILIKE :search OR 
        model.description ILIKE :search OR
        model.provider ILIKE :search
      )`, { search: `%${search}%` });
    }
    
    // Get total count for pagination
    const total = await query.getCount();
    
    // Get paginated results
    const models = await query
      .orderBy('model.updatedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();
    
    return {
      data: models,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit
      }
    };
  }

  async getModelById(id: string) {
    return await this.modelRepository.findOne({ 
      where: { id },
      relations: ['carbonFootprints']
    });
  }

  async getModelByProviderId(provider: string, modelId: string) {
    return await this.modelRepository.findOne({ 
      where: { provider, id: modelId },
      relations: ['carbonFootprints']
    });
  }

  async createModel(data: Partial<ModelInfo>) {
    const model = this.modelRepository.create(data);
    return await this.modelRepository.save(model);
  }

  async updateModel(id: string, updates: Partial<ModelInfo>) {
    await this.modelRepository.update(id, updates);
    return await this.getModelById(id);
  }

  async deleteModel(id: string) {
    const result = await this.modelRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async getModelCarbonFootprint(modelId: string, region?: string) {
    const query = this.carbonFootprintRepository
      .createQueryBuilder('footprint')
      .where('footprint.modelId = :modelId', { modelId });
    
    if (region) {
      query.andWhere('footprint.region = :region', { region });
    }
    
    query.orderBy('footprint.updatedAt', 'DESC');
    
    return await query.getOne();
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
    }
  ) {
    const { region, emissions, energy, intensity, modelName, provider } = data;
    
    // Find the model first to ensure it exists and get its data
    const model = await this.modelRepository.findOne({
      where: { id: modelId }
    });

    if (!model) {
      throw new Error(`Model with ID ${modelId} not found`);
    }

    // Find existing footprint for this model and region
    let footprint = await this.carbonFootprintRepository.findOne({
      where: { model: { id: modelId }, region },
      relations: ['model']
    });
    
    if (footprint) {
      // Update existing footprint
      footprint.emissions = emissions;
      footprint.energy = energy;
      if (intensity !== undefined) footprint.intensity = intensity;
      if (modelName) footprint.modelName = modelName;
      if (provider) footprint.provider = provider;
    } else {
      // Create new footprint with the model relationship
      footprint = this.carbonFootprintRepository.create({
        modelId: modelId,  // Set the model relationship using modelId
        region,
        emissions,
        energy,
        intensity: intensity,  // Can be undefined, which is fine since the column is nullable
        modelName: modelName || model.name,  // Use provided name or fallback to model's name
        provider: provider || model.provider,  // Use provided provider or fallback to model's provider
        model: model  // Also set the relation object for type safety
      });
    }
    
    return this.carbonFootprintRepository.save(footprint);
  }

  async getRecommendedModels(
    capability: string,
    region?: string,
    limit: number = 5
  ) {
    // Base query to find models with the required capability
    const query = this.modelRepository
      .createQueryBuilder('model')
      .where(':capability = ANY(model.capabilities)', { capability })
      .orderBy('model.updatedAt', 'DESC')
      .take(limit);
    
    // If region is provided, join with carbon footprints and order by carbon efficiency
    if (region) {
      query
        .leftJoin('model.carbonFootprints', 'footprint', 'footprint.region = :region', { region })
        .orderBy('footprint.emissions', 'ASC')
        .addOrderBy('model.updatedAt', 'DESC');
    }
    
    return await query.getMany();
  }

  async syncWithProvider(provider: string, models: Array<{
    providerModelId: string;
    name: string;
    description?: string;
    contextWindow?: number;
    maxOutputTokens?: number;
    capabilities?: string[];
    isActive?: boolean;
  }>) {
    const queryRunner = databaseService.getDataSource().createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // Get existing models for this provider
      const existingModels = await queryRunner.manager.find(ModelInfo, {
        where: { provider }
      });
      
      const processedIds = new Set<string>();
      const results = {
        created: 0,
        updated: 0,
        deactivated: 0
      };
      
      // Process each model from the provider
      for (const modelData of models) {
        const { providerModelId, ...modelProps } = modelData;
        const modelId = `${provider}:${providerModelId}`; // Create a unique ID using provider and model ID
        
        // Find existing model by ID (which is now provider:providerModelId)
        let model = await queryRunner.manager.findOne(ModelInfo, {
          where: { id: modelId }
        });
        
        if (model) {
          // Update existing model
          Object.assign(model, {
            ...modelProps,
            providerModelId,
            isActive: true,
            updatedAt: new Date()
          });
          results.updated++;
        } else {
          // Create new model
          model = queryRunner.manager.create(ModelInfo, {
            id: modelId,
            provider,
            providerModelId,
            ...modelProps,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          results.created++;
        }
        
        await queryRunner.manager.save(ModelInfo, model);
        
        processedIds.add(providerModelId);
      }
      
      // Deactivate models that weren't in the sync data
      for (const model of existingModels) {
        if (!processedIds.has(model.providerModelId) && model.isActive) {
          model.isActive = false;
          model.updatedAt = new Date();
          await queryRunner.manager.save(ModelInfo, model);
          results.deactivated++;
        }
      }
      
      await queryRunner.commitTransaction();
      return results;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error syncing models with provider:', error);
      throw new Error('Failed to sync models with provider');
    } finally {
      await queryRunner.release();
    }
  }
}

export const modelService = new ModelService();
