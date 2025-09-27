export interface User {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  emailVerified?: boolean;
  avatarUrl?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}
