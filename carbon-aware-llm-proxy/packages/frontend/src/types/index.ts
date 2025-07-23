export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  role: string;
  total_requests: number;
  total_tokens_used: number;
  total_carbon_footprint_kg: number;
  carbon_saved_kg: number;
  created_at: string;
  updated_at: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme?: "light" | "dark" | "system";
  email_notifications?: boolean;
  push_notifications?: boolean;
  marketing_emails?: boolean;
  security_alerts?: boolean;
  carbon_aware?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: UserProfile;
  token: string;
  refresh_token: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: Record<string, string[]>;
}
