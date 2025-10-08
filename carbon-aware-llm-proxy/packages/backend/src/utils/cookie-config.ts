import { Response } from 'express';

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge: number;
  domain?: string;
}

/**
 * Smart cookie configuration that adapts to environment
 */
export function getCookieConfig(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const forwardedProto = process.env.HTTP_X_FORWARDED_PROTO || process.env.FORWARDED_PROTO;
  const isHttps = isProduction || forwardedProto === 'https' || process.env.HTTPS === 'true';

  // Development-friendly configuration
  if (!isProduction) {
    const devSameSiteEnv = (process.env.DEV_COOKIE_SAMESITE || '').toLowerCase();
    const devSameSite = (['strict', 'lax', 'none'] as const).includes(
      devSameSiteEnv as any,
    )
      ? (devSameSiteEnv as CookieOptions['sameSite'])
      : undefined;

    const preferredSameSite = devSameSite || 'lax';
    const secureOverride = process.env.DEV_COOKIE_SECURE === 'true';
    const secure = preferredSameSite === 'none' ? true : secureOverride;

    return {
      httpOnly: true,
      secure,
      sameSite: secure ? preferredSameSite : preferredSameSite === 'none' ? 'lax' : preferredSameSite,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };
  }

  // Production-secure configuration
  return {
    httpOnly: true,
    secure: isHttps, // Use HTTPS in production
    sameSite: 'none', // Required for cross-origin in production
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

/**
 * Set authentication cookie with smart configuration
 */
export function setAuthCookie(res: Response, token: string): void {
  const cookieConfig = getCookieConfig();

  res.cookie('auth_token', token, {
    ...cookieConfig,
    // Ensure we don't override the domain in development
    domain: cookieConfig.domain || undefined,
  });

  // Log cookie configuration for debugging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🍪 Cookie Configuration:', {
      ...cookieConfig,
      // Don't log the actual token
      tokenLength: token.length,
    });
  }
}

/**
 * Clear authentication cookie
 */
export function clearAuthCookie(res: Response): void {
  const cookieConfig = getCookieConfig();

  res.clearCookie('auth_token', {
    ...cookieConfig,
    maxAge: 0, // Immediately expire
  });
}

/**
 * Get CORS origins from environment with development defaults
 */
export function getCorsOrigins(): string[] {
  const corsOrigins = process.env.CORS_ORIGINS || '';

  if (!corsOrigins.trim()) {
    // Development defaults
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ];
  }

  return corsOrigins.split(',').map(origin => origin.trim());
}