import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { authService } from "../services/auth.service";
import { supabaseService } from "../services/supabase.service";
import { logger } from "../utils/logger";
import { setAuthCookie, clearAuthCookie } from "../utils/cookie-config";

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;
      const result = await authService.register(email, password, name);

      // Set HttpOnly auth cookie with smart configuration
      setAuthCookie(res, result.token);

      res.status(201).json({
        success: true,
        data: { user: result.user },
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

      // Set HttpOnly auth cookie with smart configuration
      setAuthCookie(res, result.token);

      res.json({
        success: true,
        data: { user: result.user },
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
      const updates: any = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (avatar_url !== undefined) updates.avatarUrl = avatar_url;

      const updatedUser = await supabaseService.updateUser(user.id, updates);

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

      const { data, error } = await supabaseService.getClient().from('user_preferences').select('*').eq('userId', user.id).single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching user preferences:', error);
        throw error;
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "User preferences not found",
        });
      }

      res.json({
        success: true,
        data: data,
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
      const { data: preferences, error } = await supabaseService.getClient().from('user_preferences').select('*').eq('userId', user.id).single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching user preferences:', error);
        throw error;
      }

      const updatedPreferences = { ...updates, updatedAt: new Date() };

      let result;
      if (preferences) {
        result = await supabaseService.getClient().from('user_preferences').update(updatedPreferences).eq('userId', user.id).select().single();
      } else {
        result = await supabaseService.getClient().from('user_preferences').insert({ ...updatedPreferences, userId: user.id, createdAt: new Date() }).select().single();
      }

      if (result.error) {
        logger.error('Error updating/inserting user preferences:', result.error);
        throw result.error;
      }

      res.json({
        success: true,
        data: result.data,
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

  async logout(req: Request, res: Response) {
    try {
      // Clear auth cookie with smart configuration
      clearAuthCookie(res);
      res.json({ success: true });
    } catch (error) {
      logger.error("Logout error:", error);
      res.status(500).json({ success: false, message: "Logout failed" });
    }
  }

  // Development-only helper method
  async getRecentRegistrations(req: Request, res: Response) {
    try {
      if (process.env.NODE_ENV !== 'development') {
        return res.status(404).json({ success: false, message: "Not found" });
      }

      // This is a development helper to see what emails have been registered
      // In a real application, you would implement proper email confirmation flow
      res.json({
        success: true,
        message: "Development mode: Recent registrations require email confirmation",
        registrations: [
          {
            email: "testuser@gmail.com",
            status: "requires_email_confirmation",
            note: "Check the Supabase dashboard to confirm emails or use a real email service"
          }
        ]
      });
    } catch (error) {
      logger.error("Debug endpoint error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
}

export const authController = new AuthController();
