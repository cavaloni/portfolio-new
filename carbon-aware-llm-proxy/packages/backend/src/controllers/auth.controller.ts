import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { authService } from "../services/auth.service";
import { databaseService } from "../services/database.service";
import { User } from "../entities/User";
import { UserPreferences } from "../entities/UserPreferences";
import { logger } from "../utils/logger";

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;
      const result = await authService.register(email, password, name);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error("Registration error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Registration failed",
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const result = await authService.login(email, password);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error("Login error:", error);
      res.status(401).json({
        success: false,
        message: error.message || "Authentication failed",
      });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.params;
      await authService.verifyEmail(token);

      res.json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error: any) {
      logger.error("Email verification error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Email verification failed",
      });
    }
  }

  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body;
      await authService.requestPasswordReset(email);

      res.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent",
      });
    } catch (error: any) {
      logger.error("Password reset request error:", error);
      res.status(400).json({
        success: false,
        message: "Failed to process password reset request",
      });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const { password } = req.body;

      await authService.resetPassword(token, password);

      res.json({
        success: true,
        message: "Password reset successful",
      });
    } catch (error: any) {
      logger.error("Password reset error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Password reset failed",
      });
    }
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      // The user is attached to the request by the auth middleware
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error("Get current user error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user data",
      });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { name, avatar_url } = req.body;
      const userRepository = databaseService.getDataSource().getRepository(User);

      if (name !== undefined) user.name = name;
      if (avatar_url !== undefined) user.avatarUrl = avatar_url;

      const updatedUser = await userRepository.save(user);

      const { passwordHash, ...sanitizedUser } = updatedUser;
      res.json({
        success: true,
        data: sanitizedUser,
      });
    } catch (error) {
      logger.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update profile",
      });
    }
  }

  async getUserPreferences(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const preferencesRepository = databaseService.getDataSource().getRepository(UserPreferences);
      const preferences = await preferencesRepository.findOne({
        where: { userId: user.id },
      });

      if (!preferences) {
        return res.status(404).json({
          success: false,
          message: "User preferences not found",
        });
      }

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      logger.error("Get user preferences error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user preferences",
      });
    }
  }

  async updateUserPreferences(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const updates = req.body;
      const preferencesRepository = databaseService.getDataSource().getRepository(UserPreferences);

      let preferences = await preferencesRepository.findOne({
        where: { userId: user.id },
      });

      if (!preferences) {
        preferences = new UserPreferences();
        preferences.userId = user.id;
        preferences.user = user;
      }

      // Update preferences with provided values
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined && preferences) {
          (preferences as any)[key] = updates[key];
        }
      });

      const updatedPreferences = await preferencesRepository.save(preferences);

      res.json({
        success: true,
        data: updatedPreferences,
      });
    } catch (error) {
      logger.error("Update user preferences error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update user preferences",
      });
    }
  }

  async getUserCarbonStats(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      // For now, return mock data - in a real implementation, this would query actual usage data
      const carbonStats = {
        total_carbon_footprint_kg: 0,
        carbon_saved_kg: 0,
        carbon_intensity_avg: 0,
        usage_by_model: [],
        usage_by_time: [],
      };

      res.json({
        success: true,
        data: carbonStats,
      });
    } catch (error) {
      logger.error("Get user carbon stats error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch carbon stats",
      });
    }
  }
}

export const authController = new AuthController();
