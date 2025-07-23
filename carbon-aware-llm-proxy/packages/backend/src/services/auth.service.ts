import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { User } from "../entities/User";
import { UserPreferences } from "../entities/UserPreferences";
import { databaseService } from "./database.service";
import { logger } from "../utils/logger";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

class AuthService {
  async register(email: string, password: string, name?: string) {
    const userRepository = databaseService.getDataSource().getRepository(User);
    const existingUser = await userRepository.findOne({ where: { email } });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerificationToken = uuidv4();

    // Start a transaction
    const queryRunner = databaseService.getDataSource().createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create user
      const user = new User();
      user.email = email;
      user.passwordHash = hashedPassword;
      user.name = name || email.split("@")[0];
      user.emailVerificationToken = emailVerificationToken;
      user.emailVerificationExpires = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ); // 24 hours

      const savedUser = await queryRunner.manager.save(user);

      // Create default preferences
      const preferences = new UserPreferences();
      preferences.user = savedUser;
      preferences.userId = savedUser.id;
      preferences.theme = "system";
      preferences.carbonAware = true;
      preferences.showCarbonImpact = true;
      preferences.emailNotifications = true;

      await queryRunner.manager.save(preferences);

      await queryRunner.commitTransaction();

      // Send verification email (implementation would go here)
      logger.info(`Verification email sent to ${email}`);

      // Generate JWT token
      const token = this.generateToken(savedUser);

      return {
        user: this.sanitizeUser(savedUser),
        token,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error("Error during user registration:", error);
      throw new Error("Failed to register user");
    } finally {
      await queryRunner.release();
    }
  }

  async login(email: string, password: string) {
    const userRepository = databaseService.getDataSource().getRepository(User);
    const user = await userRepository.findOne({
      where: { email },
      select: ["id", "email", "passwordHash", "role", "emailVerified"],
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    if (!user.emailVerified) {
      throw new Error("Please verify your email address");
    }

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async verifyEmail(token: string) {
    const userRepository = databaseService.getDataSource().getRepository(User);
    const user = await userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new Error("Invalid verification token");
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < new Date()
    ) {
      throw new Error("Verification token has expired");
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;

    await userRepository.save(user);

    return { success: true };
  }

  async requestPasswordReset(email: string) {
    const userRepository = databaseService.getDataSource().getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      // Don't reveal that the email doesn't exist
      return { success: true };
    }

    const resetToken = uuidv4();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await userRepository.save(user);

    // Send password reset email (implementation would go here)
    logger.info(`Password reset email sent to ${email}`);

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const userRepository = databaseService.getDataSource().getRepository(User);
    const user = await userRepository.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      throw new Error("Reset token has expired");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.passwordHash = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await userRepository.save(user);

    return { success: true };
  }

  generateToken(user: User): string {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // Create options with proper typing for JWT sign
    const options: jwt.SignOptions = {
      algorithm: "HS256",
    };

    // Handle expiresIn with proper type assertion
    if (JWT_EXPIRES_IN) {
      if (typeof JWT_EXPIRES_IN === "number") {
        // For number type, convert to seconds string
        options.expiresIn =
          `${Math.floor(JWT_EXPIRES_IN)}s` as unknown as number;
      } else {
        // For string type, use as is with type assertion
        options.expiresIn = JWT_EXPIRES_IN as unknown as number;
      }
    }

    try {
      return jwt.sign(payload, JWT_SECRET, options);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to generate token: ${errorMessage}`);
    }
  }

  verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
        role: string;
      };
    } catch (error) {
      return null;
    }
  }

  private sanitizeUser(user: User) {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

export const authService = new AuthService();
