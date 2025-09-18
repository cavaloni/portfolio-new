import { Router, Request, Response } from "express";
import { authController } from "../controllers/auth.controller";
import {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  requestPasswordResetValidator,
  resetPasswordValidator,
} from "../middleware/validators/auth.validator";
import { authenticate } from "../middleware/auth";
import passport from "passport";
import { authService } from "../services/auth.service";
import { logger } from "../utils/logger";

const router = Router();

// Public routes
router.post("/register", registerValidator, authController.register);
router.post("/login", loginValidator, authController.login);
router.post("/logout", authController.logout);
router.get(
  "/verify-email/:token",
  verifyEmailValidator,
  authController.verifyEmail,
);
router.post(
  "/request-password-reset",
  requestPasswordResetValidator,
  authController.requestPasswordReset,
);
router.post(
  "/reset-password/:token",
  resetPasswordValidator,
  authController.resetPassword,
);

// Development helper endpoint (only in development)
if (process.env.NODE_ENV === 'development') {
  router.get("/debug/recent-registrations", authController.getRecentRegistrations);
}

// Protected routes
router.get("/me", authenticate, authController.getCurrentUser);

// --- OAuth routes ---
function buildFrontendUrl(path: string) {
  const base = process.env.FRONTEND_APP_URL || "http://127.0.0.1:3000";
  return base.replace(/\/$/, "") + path;
}

function validateNext(nextParam?: string | null): string {
  if (!nextParam) return "/dashboard";
  try {
    const decoded = Buffer.from(nextParam, "base64").toString("utf8");
    // Only allow internal redirects
    if (decoded.startsWith("/") && !decoded.startsWith("//")) {
      return decoded;
    }
  } catch (e) {
    logger.warn("Invalid next state provided to OAuth callback");
  }
  return "/dashboard";
}

// Provider login endpoints with state=next
router.get("/oauth/google", (req, res, next) => {
  const nextParam = (req.query.next as string) || "/dashboard";
  const state = Buffer.from(nextParam, "utf8").toString("base64");
  (passport.authenticate("google", { scope: ["profile", "email"], state }) as any)(
    req,
    res,
    next,
  );
});

router.get("/oauth/facebook", (req, res, next) => {
  const nextParam = (req.query.next as string) || "/dashboard";
  const state = Buffer.from(nextParam, "utf8").toString("base64");
  (passport.authenticate("facebook", { scope: ["email"], state }) as any)(
    req,
    res,
    next,
  );
});

router.get("/oauth/microsoft", (req, res, next) => {
  const nextParam = (req.query.next as string) || "/dashboard";
  const state = Buffer.from(nextParam, "utf8").toString("base64");
  (passport.authenticate("microsoft", { state }) as any)(req, res, next);
});

// Callback handlers: issue JWT cookie and redirect to frontend
const oauthSuccessHandler = (req: Request, res: Response) => {
  try {
    const user = (req as any).user as { id: string; email: string; role: string };
    if (!user) {
      return res.redirect(buildFrontendUrl("/login?error=oauth_no_user"));
    }

    const token = authService.generateToken(user as any);
    const forwardedProto = (req.headers["x-forwarded-proto"] as string) || "";
    const secure = process.env.NODE_ENV === "production" || forwardedProto === "https";
    res.cookie("auth_token", token, {
      httpOnly: true,
      sameSite: "none",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    const nextPath = validateNext(req.query.state as string | undefined);
    return res.redirect(buildFrontendUrl(nextPath));
  } catch (err) {
    logger.error("OAuth success handler error", err);
    return res.redirect(buildFrontendUrl("/login?error=oauth_internal"));
  }
};

router.get(
  "/oauth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: (process.env.FRONTEND_APP_URL || "") + "/login?error=oauth",
  }) as any,
  oauthSuccessHandler,
);

router.get(
  "/oauth/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: (process.env.FRONTEND_APP_URL || "") + "/login?error=oauth",
  }) as any,
  oauthSuccessHandler,
);

router.get(
  "/oauth/microsoft/callback",
  passport.authenticate("microsoft", {
    session: false,
    failureRedirect: (process.env.FRONTEND_APP_URL || "") + "/login?error=oauth",
  }) as any,
  oauthSuccessHandler,
);

export { router as authRouter };
