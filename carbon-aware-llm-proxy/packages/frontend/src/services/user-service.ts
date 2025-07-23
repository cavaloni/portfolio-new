import { apiGet, apiPost, apiPut, withAuth } from "@/lib/api-client";

export interface UserPreferences {
  id: string;
  user_id: string;
  default_model_id: string;
  carbon_aware_enabled: boolean;
  carbon_aware_aggressiveness: "low" | "medium" | "high";
  dark_mode: "light" | "dark" | "system";
  show_carbon_footprint: boolean;
  show_energy_usage: boolean;
  max_tokens: number;
  temperature: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  total_requests: number;
  total_tokens_used: number;
  total_carbon_footprint_kg: number;
  carbon_saved_kg: number;
  created_at: string;
  preferences: UserPreferences;
}

export const userService = {
  // Get current user's profile
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const response = await apiGet<{ user: UserProfile }>("/v1/users/me", {
        headers: withAuth(),
      });

      if (response.error || !response.data) {
        console.warn(
          "User not authenticated or error fetching profile:",
          response.error?.message,
        );
        return null;
      }

      return response.data.user;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  },

  // Get user preferences
  async getUserPreferences(): Promise<UserPreferences | null> {
    try {
      const response = await apiGet<{ preferences: UserPreferences }>(
        "/v1/users/me/preferences",
        { headers: withAuth() },
      );

      if (response.error || !response.data) {
        console.warn(
          "Error fetching user preferences:",
          response.error?.message,
        );
        return null;
      }

      return response.data.preferences;
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      return null;
    }
  },

  // Update user preferences
  async updateUserPreferences(
    updates: Partial<
      Omit<UserPreferences, "id" | "user_id" | "created_at" | "updated_at">
    >,
  ): Promise<UserPreferences | null> {
    try {
      const response = await apiPut<{ preferences: UserPreferences }>(
        "/v1/users/me/preferences",
        updates,
        { headers: withAuth() },
      );

      if (response.error || !response.data) {
        throw new Error(
          response.error?.message || "Failed to update preferences",
        );
      }

      return response.data.preferences;
    } catch (error) {
      console.error("Error updating user preferences:", error);
      throw error;
    }
  },

  // Get user's carbon stats
  async getUserCarbonStats() {
    try {
      const response = await apiGet<{
        total_carbon_footprint_kg: number;
        carbon_saved_kg: number;
        carbon_intensity_avg: number;
        usage_by_model: Array<{
          model_id: string;
          request_count: number;
          token_count: number;
          carbon_footprint_kg: number;
        }>;
        usage_by_time: Array<{
          date: string;
          request_count: number;
          carbon_footprint_kg: number;
        }>;
      }>("/v1/users/me/carbon-stats", { headers: withAuth() });

      if (response.error || !response.data) {
        console.warn("Error fetching carbon stats:", response.error?.message);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching carbon stats:", error);
      return null;
    }
  },

  // Update user profile
  async updateProfile(updates: {
    name?: string;
    avatar_url?: string;
  }): Promise<UserProfile | null> {
    try {
      const response = await apiPut<{ user: UserProfile }>(
        "/v1/users/me",
        updates,
        { headers: withAuth() },
      );

      if (response.error || !response.data) {
        throw new Error(response.error?.message || "Failed to update profile");
      }

      return response.data.user;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  },

  // Request password reset
  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      const response = await apiPost<{ success: boolean }>(
        "/v1/auth/forgot-password",
        { email },
      );
      return response.data?.success || false;
    } catch (error) {
      console.error("Error requesting password reset:", error);
      return false;
    }
  },

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const response = await apiPost<{ success: boolean }>(
        "/v1/auth/reset-password",
        {
          token,
          password: newPassword,
        },
      );
      return response.data?.success || false;
    } catch (error) {
      console.error("Error resetting password:", error);
      return false;
    }
  },
};
