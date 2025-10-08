export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AnonymousUser {
  isAnonymous: true;
  creditsRemaining: number;
  creditsLimit: number;
  creditsUsed: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  bio?: string;
  website?: string;
  location?: string;
  role?: string;
  preferences?: UserPreferences;
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferences {
  theme?: "light" | "dark" | "system";
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  marketingEmails?: boolean;
  securityAlerts?: boolean;
  carbonAware?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface UpdateProfileData {
  name?: string;
  bio?: string;
  website?: string;
  location?: string;
  avatar_url?: string;
}
