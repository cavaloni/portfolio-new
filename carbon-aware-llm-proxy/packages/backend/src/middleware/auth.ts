import { Request, Response, NextFunction, RequestHandler } from "express";
import { authService } from "../services/auth.service";
import { supabaseService } from "../services/supabase.service";
import { logger } from "../utils/logger";

type AuthMiddleware = {
  authenticate: RequestHandler;
  authorize: (roles: string[]) => RequestHandler;
  authenticateOptional: RequestHandler;
};

export interface AuthenticatedRequest extends Request {
  user?: Partial<any>;
}

// Authentication middleware
export const authenticate: RequestHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token: string | null = null;
    const authHeader = req.headers.authorization;

    // Debug logging for cookie inspection
    if (process.env.NODE_ENV === 'development') {
      logger.info('Auth middleware debug:', {
        cookies: (req as any).cookies,
        authHeader: authHeader ? 'Bearer token present' : 'No auth header',
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin,
        referer: req.headers.referer
      });
    }

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if ((req as any).cookies?.auth_token) {
      token = (req as any).cookies.auth_token as string;
    }

    if (!token) {
      logger.warn('Authentication failed: No token found', {
        hasCookies: !!(req as any).cookies,
        cookieKeys: (req as any).cookies ? Object.keys((req as any).cookies) : [],
        hasAuthHeader: !!authHeader
      });
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = authService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Get user from JWT token data (since login already validates with Supabase Auth)
    let user;
    const isMockAuth = process.env.MOCK_AUTH === "true";

    if (isMockAuth && decoded.id.startsWith('mock-')) {
      // For mock auth, reconstruct the user from the token
      user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.email.split('@')[0],
        email_verified: true,
        role: decoded.role || 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } else {
      // For real auth, use the user data from the JWT token
      // (login process already validated with Supabase Auth)
      user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name || decoded.email.split('@')[0],
        email_verified: decoded.email_verified || true,
        role: decoded.role || 'user',
        created_at: decoded.created_at || new Date().toISOString(),
        updated_at: decoded.updated_at || new Date().toISOString()
      };
    }

    if (!user || !user.id || !user.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid user data in token",
      });
    }

    // Attach user to request object
    const { passwordHash, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;

    next();
  } catch (error) {
    logger.error("Authentication error:", error);
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

export const authenticateOptional: RequestHandler = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    let token: string | null = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if ((req as any).cookies?.auth_token) {
      token = (req as any).cookies.auth_token as string;
    }

    if (!token) {
      return next();
    }

    const decoded = authService.verifyToken(token);

    if (!decoded) {
      return next();
    }

    const user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name || decoded.email.split('@')[0],
      email_verified: decoded.email_verified || true,
      role: decoded.role || 'user',
      created_at: decoded.created_at || new Date().toISOString(),
      updated_at: decoded.updated_at || new Date().toISOString(),
    };

    const { passwordHash, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    return next();
  } catch (error) {
    logger.warn('Optional authentication parse failed', { error });
    return next();
  }
};

// Authorization middleware
export const authorize = (roles: string[]): RequestHandler => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role || "")) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

// Export auth object for backward compatibility
export const auth = {
  authenticate,
  authenticateOptional,
  authorize,
};
