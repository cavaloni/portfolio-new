import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { modelService } from "../services/model.service";
import { logger } from "../utils/logger";

export class ModelController {
  // Get all models with optional filtering
  async getModels(req: Request, res: Response) {
    try {
      const {
        provider,
        capability,
        search,
        page = "1",
        limit = "20",
      } = req.query;

      const result = await modelService.getAllModels({
        provider: provider as string,
        capability: capability as string,
        search: search as string,
        page: parseInt(page as string, 10) || 1,
        limit: Math.min(parseInt(limit as string, 10) || 20, 100),
      });

      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      logger.error("Get models error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch models",
      });
    }
  }

  // Get a single model by ID
  async getModel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const model = await modelService.getModelById(id);

      if (!model) {
        return res.status(404).json({
          success: false,
          message: "Model not found",
        });
      }

      res.json({
        success: true,
        data: model,
      });
    } catch (error) {
      logger.error("Get model error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch model",
      });
    }
  }

  // Create a new model (admin only)
  async createModel(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const model = await modelService.createModel(req.body);

      res.status(201).json({
        success: true,
        data: model,
      });
    } catch (error: any) {
      logger.error("Create model error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create model",
      });
    }
  }

  // Update a model (admin only)
  async updateModel(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const model = await modelService.updateModel(id, req.body);

      if (!model) {
        return res.status(404).json({
          success: false,
          message: "Model not found",
        });
      }

      res.json({
        success: true,
        data: model,
      });
    } catch (error: any) {
      logger.error("Update model error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update model",
      });
    }
  }

  // Delete a model (admin only)
  async deleteModel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await modelService.deleteModel(id);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Model not found",
        });
      }

      res.json({
        success: true,
        message: "Model deleted successfully",
      });
    } catch (error) {
      logger.error("Delete model error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete model",
      });
    }
  }

  // Get carbon footprint for a model in a specific region
  async getModelCarbonFootprint(req: Request, res: Response) {
    try {
      const { modelId } = req.params;
      const { region } = req.query;

      const footprint = await modelService.getModelCarbonFootprint(
        modelId,
        region as string | undefined,
      );

      if (!footprint) {
        return res.status(404).json({
          success: false,
          message: "Carbon footprint data not found for this model and region",
        });
      }

      res.json({
        success: true,
        data: footprint,
      });
    } catch (error) {
      logger.error("Get model carbon footprint error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch carbon footprint data",
      });
    }
  }

  // Update carbon footprint for a model in a specific region (admin only)
  async updateModelCarbonFootprint(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { modelId } = req.params;
      const { region, emissions, energy, intensity, modelName, provider } =
        req.body;

      const footprint = await modelService.updateModelCarbonFootprint(modelId, {
        region,
        emissions,
        energy,
        intensity,
        modelName,
        provider,
      });

      res.json({
        success: true,
        data: footprint,
      });
    } catch (error: any) {
      logger.error("Update model carbon footprint error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update carbon footprint data",
      });
    }
  }

  // Get recommended models for a specific capability and optional region
  async getRecommendedModels(req: Request, res: Response) {
    try {
      const { capability } = req.params;
      const { region, limit = "5" } = req.query;

      const models = await modelService.getRecommendedModels(
        capability,
        region as string | undefined,
        parseInt(limit as string, 10) || 5,
      );

      res.json({
        success: true,
        data: models,
      });
    } catch (error) {
      logger.error("Get recommended models error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch recommended models",
      });
    }
  }

  // Sync models with a provider (admin only)
  async syncWithProvider(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { provider } = req.params;
      const { models } = req.body;

      const result = await modelService.syncWithProvider(provider, models);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error("Sync with provider error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to sync models with provider",
      });
    }
  }
}

export const modelController = new ModelController();
