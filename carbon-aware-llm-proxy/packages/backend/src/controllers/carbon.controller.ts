import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { carbonService } from "../services/carbon.service";
import { logger } from "../utils/logger";

export class CarbonController {
  // Calculate carbon footprint for a given model and token count
  async calculateFootprint(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { modelId, tokens, region } = req.body;

      const result = await carbonService.calculateCarbonFootprint(
        modelId,
        tokens,
        region,
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error("Calculate footprint error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to calculate carbon footprint",
      });
    }
  }

  // Calculate carbon savings compared to a baseline model
  async calculateSavings(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { modelId, baselineModelId, tokens, region } = req.body;

      const result = await carbonService.getCarbonSavings(
        modelId,
        baselineModelId,
        tokens,
        region,
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error("Calculate savings error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to calculate carbon savings",
      });
    }
  }

  // Get carbon intensity for a region
  async getCarbonIntensity(req: Request, res: Response) {
    try {
      const { region } = req.params;

      const intensity = await carbonService.getCarbonIntensity(region);

      res.json({
        success: true,
        data: {
          region,
          carbonIntensity: intensity,
          unit: "gCO2eq/kWh",
        },
      });
    } catch (error: any) {
      logger.error("Get carbon intensity error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to get carbon intensity",
      });
    }
  }

  // Get carbon intensity forecast for a region
  async getCarbonForecast(req: Request, res: Response) {
    try {
      const { region } = req.params;
      const { hours = "24" } = req.query;

      const forecast = await carbonService.getCarbonIntensityForecast(region);

      // Limit the number of hours if specified
      const hoursNum = parseInt(hours as string, 10);
      const limitedForecast =
        hoursNum > 0
          ? forecast.slice(0, Math.min(hoursNum, forecast.length))
          : forecast;

      res.json({
        success: true,
        data: {
          region,
          forecast: limitedForecast,
          unit: "gCO2eq/kWh",
        },
      });
    } catch (error: any) {
      logger.error("Get carbon forecast error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to get carbon forecast",
      });
    }
  }

  // Get carbon statistics for the current user
  async getUserStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { range = "month" } = req.query;
      const validRanges = ["day", "week", "month", "year"];
      const timeRange = validRanges.includes(range as string)
        ? (range as "day" | "week" | "month" | "year")
        : "month";

      const stats = await carbonService.getUserCarbonStats(userId, timeRange);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Get user stats error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get user carbon statistics",
      });
    }
  }

  // Get carbon leaderboard
  async getLeaderboard(req: Request, res: Response) {
    try {
      const { limit = "10", range = "month" } = req.query;
      const limitNum = Math.min(parseInt(limit as string, 10) || 10, 100);

      const validRanges = ["day", "week", "month", "year"];
      const timeRange = validRanges.includes(range as string)
        ? (range as "day" | "week" | "month" | "year")
        : "month";

      const leaderboard = await carbonService.getCarbonLeaderboard(
        limitNum,
        timeRange,
      );

      res.json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      logger.error("Get leaderboard error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get carbon leaderboard",
      });
    }
  }
}

export const carbonController = new CarbonController();
