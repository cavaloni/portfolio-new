import { Request, Response, RequestHandler } from "express";
import { validationResult } from "express-validator";
import { routingService } from "../services/routing.service";
import { logger } from "../utils/logger";
import { User } from "../types/user";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: Partial<User>;
    }
  }
}

export class RoutingController {
  // Get the optimal model based on request parameters
  async getOptimalModel(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const {
        region,
        capabilities = [],
        providers = [],
        carbonWeight,
        performanceWeight,
        costWeight,
      } = req.query;

      // Convert query params to appropriate types with proper type assertions
      const requiredCapabilities = (() => {
        if (Array.isArray(capabilities)) {
          return capabilities as string[];
        }
        if (typeof capabilities === "string") {
          return [capabilities];
        }
        return [];
      })();

      const preferredProviders = (() => {
        if (Array.isArray(providers)) {
          return providers as string[];
        }
        if (typeof providers === "string") {
          return [providers];
        }
        return [];
      })();

      // Get weights from query params if provided, otherwise use defaults
      const weights = {
        carbonEfficiency: carbonWeight
          ? parseFloat(carbonWeight as string)
          : undefined,
        performance: performanceWeight
          ? parseFloat(performanceWeight as string)
          : undefined,
        cost: costWeight ? parseFloat(costWeight as string) : undefined,
      };

      // Get the optimal model
      const result = await routingService.getOptimalModel({
        userId: req.user?.id,
        region: region as string,
        requiredCapabilities,
        preferredProviders,
        weights: Object.values(weights).some((w) => w !== undefined)
          ? weights
          : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error("Get optimal model error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to get optimal model",
      });
    }
  }

  // Get model recommendations based on user preferences
  async getRecommendations(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { region } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const result = await routingService.getModelRecommendations(
        userId,
        region as string,
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error("Get recommendations error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to get model recommendations",
      });
    }
  }

  // Update user preferences
  async updatePreferences(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const { weights, preferredProviders, carbonAware, costSensitive } =
        req.body;

      const updated = await routingService.updateUserPreferences(userId, {
        weights,
        preferredProviders,
        carbonAware,
        costSensitive,
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      logger.error("Update preferences error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update preferences",
      });
    }
  }

  // Get user preferences
  async getPreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      // Use the public method to get user preferences
      const preferences = await routingService.getUserPreferencesPublic(userId);
      res.json({
        success: true,
        data: preferences,
      });
    } catch (error: any) {
      logger.error("Error getting user preferences:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get user preferences",
      });
    }
  }
}

export const routingController = new RoutingController();
