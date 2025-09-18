import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { supabaseService } from "./supabase.service";
import { supabaseConfig } from "../config/supabase";
import { logger } from "../utils/logger";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

class AuthService {
  async register(email: string, password: string, name?: string) {
    // Check if mock authentication mode is enabled (separate from routing mock)
    const mockAuth = process.env.MOCK_AUTH === "true";

    if (mockAuth) {
      logger.info("Using mock auth mode for registration");

      // Mock user creation - simulate successful registration
      const mockUser = {
        id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email,
        name: name || email.split("@")[0],
        email_verified: true,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Generate JWT token
      const token = this.generateToken(mockUser);

      logger.info(`Mock user registered: ${email}`);

      return {
        user: this.sanitizeUser(mockUser),
        token,
      };
    }

    // For development, skip checking existing users in database
    // In production, you might want to check if the user already exists

    try {
      // Use regular Supabase Auth sign up
      const supabaseClient = supabaseConfig.getClient();

      // Create user using Supabase Auth sign up
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split("@")[0],
            role: 'user'
          }
        }
      });

      if (authError) {
        logger.error("Supabase Auth error:", authError);
        throw new Error(`Failed to create user: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error("Failed to create user: No user returned from Supabase Auth");
      }

      const userRecord = authData.user;

      // For development, we'll use auth user data directly
      // In production, you might want to create a record in the users table
      const savedUser = {
        id: userRecord.id,
        email: userRecord.email!,
        name: userRecord.user_metadata?.name || name || email.split("@")[0],
        email_verified: userRecord.email_confirmed_at !== null,
        role: userRecord.user_metadata?.role || 'user',
        created_at: userRecord.created_at,
        updated_at: userRecord.updated_at || userRecord.created_at
      };

      logger.info(`User registered successfully: ${email}`);

      // Generate JWT token
      const token = this.generateToken(savedUser);

      return {
        user: this.sanitizeUser(savedUser),
        token,
      };
    } catch (error) {
      logger.error("Error during user registration:", error);
      throw new Error("Failed to register user");
    }
  }

  async login(email: string, password: string) {
    // Check if mock authentication mode is enabled (separate from routing mock)
    const mockAuth = process.env.MOCK_AUTH === "true";

    if (mockAuth) {
      logger.info("Using mock auth mode for login");

      // Mock login - accept any password for mock users
      if (email && password) {
        const mockUser = {
          id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          email,
          name: email.split("@")[0],
          email_verified: true,
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Generate JWT token
        const token = this.generateToken(mockUser);

        logger.info(`Mock user logged in: ${email}`);

        return {
          user: this.sanitizeUser(mockUser),
          token,
        };
      } else {
        throw new Error("Email and password are required");
      }
    }

    try {
      // Use Supabase Auth for authentication
      const supabaseClient = supabaseConfig.getClient();

      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        // For development, if email is not confirmed, provide helpful error message
        if (authError.message?.includes('Email not confirmed') || authError.code === 'email_not_confirmed') {
          logger.warn(`Login failed for ${email}: Email not confirmed`);
          throw new Error('Please confirm your email address before logging in. Check your email for the confirmation link.');
        }

        logger.error("Supabase Auth error:", authError);
        throw new Error("Invalid credentials");
      }

      if (!authData.user) {
        throw new Error("Failed to authenticate user");
      }

      // Use auth user data directly
      const user = {
        id: authData.user.id,
        email: authData.user.email!,
        name: authData.user.user_metadata?.name || email.split("@")[0],
        email_verified: authData.user.email_confirmed_at !== null,
        role: authData.user.user_metadata?.role || 'user',
        created_at: authData.user.created_at,
        updated_at: authData.user.updated_at || authData.user.created_at
      };

      // Generate JWT token
      const token = this.generateToken(user);

      logger.info(`User logged in successfully: ${email}`);

      return {
        user: this.sanitizeUser(user),
        token,
      };
    } catch (error) {
      logger.error("Error during user login:", error);
      throw error; // Re-throw the original error for better error messages
    }
  }

  async verifyEmail(token: string) {
    const user = await supabaseService.getClient().from('users').select('*').eq('email_verification_token', token).single();

    if (!user.data) {
      throw new Error("Invalid verification token");
    }

    if (
      user.data.email_verification_expires &&
      new Date(user.data.email_verification_expires) < new Date()
    ) {
      throw new Error("Verification token has expired");
    }

    const updates = {
      email_verified: true,
      email_verification_token: null,
      email_verification_expires: null,
      updated_at: new Date().toISOString()
    };

    await supabaseService.updateUser(user.data.id, updates);

    return { success: true };
  }

  async requestPasswordReset(email: string) {
    const user = await supabaseService.getUserByEmail(email);

    if (!user) {
      // Don't reveal that the email doesn't exist
      return { success: true };
    }

    const resetToken = uuidv4();
    const updates = {
      reset_password_token: resetToken,
      reset_password_expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      updated_at: new Date().toISOString()
    };

    await supabaseService.updateUser(user.id, updates);

    // Send password reset email (implementation would go here)
    logger.info(`Password reset email sent to ${email}`);

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const userResponse = await supabaseService.getClient().from('users').select('*').eq('reset_password_token', token).single();

    if (!userResponse.data) {
      throw new Error("Invalid or expired reset token");
    }

    const user = userResponse.data;
    if (user.reset_password_expires && new Date(user.reset_password_expires) < new Date()) {
      throw new Error("Reset token has expired");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updates = {
      password_hash: hashedPassword,
      reset_password_token: null,
      reset_password_expires: null,
      updated_at: new Date().toISOString()
    };

    await supabaseService.updateUser(user.id, updates);

    return { success: true };
  }

  generateToken(user: any): string {
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

  private sanitizeUser(user: any) {
    const { password_hash, passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

export const authService = new AuthService();
