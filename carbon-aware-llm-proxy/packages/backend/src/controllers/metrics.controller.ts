import { Request, Response } from "express";
import { metricsService } from "../services/metrics.service";
import { auth } from "../middleware/auth";

export class MetricsController {
  // Get system metrics
  async getSystemMetrics(req: Request, res: Response) {
    try {
      const metrics = metricsService.getSystemMetrics();

      if (!metrics) {
        return res.status(503).json({
          success: false,
          message: "Metrics not available",
        });
      }

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error("Error getting system metrics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get system metrics",
      });
    }
  }

  // Get user metrics
  async getUserMetrics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const metrics = await metricsService.getUserMetrics(userId);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error("Error getting user metrics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get user metrics",
      });
    }
  }

  // Get aggregated metrics (admin only)
  async getAggregatedMetrics(req: Request, res: Response) {
    try {
      // In a real app, you would check for admin role here
      // For now, we'll just require authentication
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // In a real app, you would aggregate metrics across all users
      // This is a simplified version that just returns system metrics
      const metrics = metricsService.getSystemMetrics();

      if (!metrics) {
        return res.status(503).json({
          success: false,
          message: "Metrics not available",
        });
      }

      res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          system: metrics,
          // Add more aggregated metrics here
        },
      });
    } catch (error) {
      console.error("Error getting aggregated metrics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get aggregated metrics",
      });
    }
  }
}

export const metricsController = new MetricsController();
