import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

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
        data: result
      });
    } catch (error: any) {
      logger.error('Registration error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed'
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
        data: result
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Authentication failed'
      });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.params;
      await authService.verifyEmail(token);
      
      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error: any) {
      logger.error('Email verification error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Email verification failed'
      });
    }
  }

  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body;
      await authService.requestPasswordReset(email);
      
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    } catch (error: any) {
      logger.error('Password reset request error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to process password reset request'
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
        message: 'Password reset successful'
      });
    } catch (error: any) {
      logger.error('Password reset error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Password reset failed'
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
          message: 'Not authenticated'
        });
      }
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user data'
      });
    }
  }
}

export const authController = new AuthController();
