import { Request, Response } from "express";
import { redisService } from "./redis.service";
import { logger } from "../utils/logger";
import crypto from "crypto";

/**
 * Service to manage anonymous user sessions and credit tracking.
 * Uses a combination of cookies and IP addresses to maintain persistent sessions.
 */
class AnonymousSessionService {
  private readonly COOKIE_NAME = "anon_session_id";
  private readonly COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly CREDIT_KEY_PREFIX = "anon_credits:";
  private readonly FREE_PROMPTS_KEY_PREFIX = "free_prompts:";
  
  /**
   * Get or create an anonymous session identifier from cookie or IP
   */
  getSessionId(req: Request, res: Response): { id: string; isNew: boolean } {
    // Try to get session ID from cookie first
    const cookieSessionId = (req as any).cookies?.[this.COOKIE_NAME];
    
    if (cookieSessionId && this.isValidSessionId(cookieSessionId)) {
      return { id: cookieSessionId, isNew: false };
    }
    
    // Generate new session ID and set cookie
    const newSessionId = this.generateSessionId();
    this.setSessionCookie(res, newSessionId);
    
    return { id: newSessionId, isNew: true };
  }
  
  /**
   * Get client IP address with proxy support
   */
  getClientIp(req: Request): string {
    const xForwarded = (req.headers["x-forwarded-for"] as string) || "";
    if (xForwarded) {
      return xForwarded.split(",")[0].trim();
    }
    
    const xRealIp = (req.headers["x-real-ip"] as string) || "";
    if (xRealIp) {
      return xRealIp;
    }
    
    return (req.socket.remoteAddress || "unknown").replace("::ffff:", "");
  }
  
  /**
   * Get composite key for tracking (session ID + IP for additional verification)
   */
  getTrackingKey(req: Request, res: Response): string {
    const { id } = this.getSessionId(req, res);
    return id;
  }
  
  /**
   * Get remaining anonymous credits for a session
   */
  async getRemainingCredits(req: Request, res: Response): Promise<number> {
    try {
      const sessionId = this.getTrackingKey(req, res);
      const key = `${this.CREDIT_KEY_PREFIX}${sessionId}`;
      const limit = this.getCreditsLimit();
      
      const used = await redisService.get(key);
      const usedCount = typeof used === "number" ? used : 0;
      
      return Math.max(0, limit - usedCount);
    } catch (error) {
      logger.error("Error getting remaining credits:", error);
      return this.getCreditsLimit(); // Default to full limit on error
    }
  }
  
  /**
   * Check if anonymous user has credits remaining
   */
  async hasCreditsRemaining(req: Request, res: Response): Promise<boolean> {
    const remaining = await this.getRemainingCredits(req, res);
    return remaining > 0;
  }
  
  /**
   * Consume one anonymous credit
   * @returns Object with success status and remaining credits
   */
  async consumeCredit(req: Request, res: Response): Promise<{
    success: boolean;
    remaining: number;
    limit: number;
    used: number;
  }> {
    try {
      const sessionId = this.getTrackingKey(req, res);
      const key = `${this.CREDIT_KEY_PREFIX}${sessionId}`;
      const limit = this.getCreditsLimit();
      const windowSec = this.getCreditsWindowSec();
      
      // Get current usage
      const currentUsed = (await redisService.get(key)) || 0;
      const used = typeof currentUsed === "number" ? currentUsed : 0;
      
      // Check if limit reached
      if (used >= limit) {
        logger.warn("Anonymous credit limit reached", { sessionId, used, limit });
        return {
          success: false,
          remaining: 0,
          limit,
          used,
        };
      }
      
      // Increment usage
      const newUsed = used + 1;
      await redisService.set(key, newUsed, windowSec);
      
      const remaining = Math.max(0, limit - newUsed);
      
      logger.info("Anonymous credit consumed", {
        sessionId,
        used: newUsed,
        remaining,
        limit,
      });
      
      return {
        success: true,
        remaining,
        limit,
        used: newUsed,
      };
    } catch (error) {
      logger.error("Error consuming anonymous credit:", error);
      return {
        success: false,
        remaining: 0,
        limit: this.getCreditsLimit(),
        used: 0,
      };
    }
  }
  
  /**
   * Reset credits for a session (useful for testing)
   */
  async resetCredits(req: Request, res: Response): Promise<boolean> {
    try {
      const sessionId = this.getTrackingKey(req, res);
      const key = `${this.CREDIT_KEY_PREFIX}${sessionId}`;
      await redisService.del(key);
      logger.info("Anonymous credits reset", { sessionId });
      return true;
    } catch (error) {
      logger.error("Error resetting anonymous credits:", error);
      return false;
    }
  }
  
  /**
   * Get credits limit from environment
   */
  private getCreditsLimit(): number {
    return Number(process.env.ANONYMOUS_FREE_CREDITS || 5);
  }
  
  /**
   * Get credits window in seconds from environment
   */
  private getCreditsWindowSec(): number {
    return Number(process.env.FREE_PROMPTS_WINDOW_SEC || 24 * 60 * 60); // 24 hours
  }
  
  /**
   * Generate a secure session ID
   */
  private generateSessionId(): string {
    return `anon_${crypto.randomBytes(32).toString("hex")}`;
  }
  
  /**
   * Validate session ID format
   */
  private isValidSessionId(id: string): boolean {
    return /^anon_[a-f0-9]{64}$/.test(id);
  }
  
  /**
   * Set session cookie with secure configuration
   */
  private setSessionCookie(res: Response, sessionId: string): void {
    const isProduction = process.env.NODE_ENV === "production";
    
    res.cookie(this.COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: this.COOKIE_MAX_AGE,
      path: "/",
    });
  }
}

export const anonymousSessionService = new AnonymousSessionService();
