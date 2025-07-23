import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  requestPasswordResetValidator,
  resetPasswordValidator,
} from "../middleware/validators/auth.validator";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/register", registerValidator, authController.register);
router.post("/login", loginValidator, authController.login);
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

// Protected routes
router.get("/me", authenticate, authController.getCurrentUser);

export default router;
