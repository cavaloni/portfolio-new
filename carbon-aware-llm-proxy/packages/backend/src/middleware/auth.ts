import { Request, Response, NextFunction, RequestHandler } from 'express';
import { authService } from '../services/auth.service';
import { databaseService } from '../services/database.service';
import { User } from '../entities/User';
import { logger } from '../utils/logger';

type AuthMiddleware = {
  authenticate: RequestHandler;
  authorize: (roles: string[]) => RequestHandler;
};

export interface AuthenticatedRequest extends Request {
  user?: Partial<User>;
}

// Authentication middleware
export const authenticate: RequestHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    
    // Get user from database
    const userRepository = databaseService.getDataSource().getRepository(User);
    const user = await userRepository.findOne({ 
      where: { id: decoded.id },
      relations: ['preferences']
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Attach user to request object
    const { passwordHash, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

// Authorization middleware
export const authorize = (roles: string[]): RequestHandler => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    if (!roles.includes(req.user.role || '')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }
    
    next();
  };
};

// Export auth object for backward compatibility
export const auth = {
  authenticate,
  authorize
};
