"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useUser, useLogin, useLogout, useSignup } from "@/hooks/use-auth";
import { UserProfile } from "@/types";

type AuthContextType = {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useUser();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const signupMutation = useSignup();

  // No demo cookie handling; backend sets HttpOnly cookie and /v1/users/me responds accordingly.

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const signup = async (email: string, password: string, name: string) => {
    await signupMutation.mutateAsync({ email, password, name });
  };

  const value = useMemo(() => {
    const now = new Date().toISOString();

    // Create a properly typed user object with all required fields
    const userWithDefaults: UserProfile | null = user
      ? {
          // Required fields
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          avatar_url: user.avatar_url ?? null,
          bio: "bio" in user ? ((user as any).bio ?? null) : null,
          website: "website" in user ? ((user as any).website ?? null) : null,
          location:
            "location" in user ? ((user as any).location ?? null) : null,
          role: "role" in user ? (user as any).role : "user",
          total_requests: user.total_requests ?? 0,
          total_tokens_used: user.total_tokens_used ?? 0,
          total_carbon_footprint_kg: user.total_carbon_footprint_kg ?? 0,
          carbon_saved_kg: user.carbon_saved_kg ?? 0,
          created_at: user.created_at || now,
          updated_at: "updated_at" in user ? (user as any).updated_at : now,
          // Handle preferences with type safety
          preferences: user.preferences ?? {
            id: "",
            user_id: user.id,
            created_at: now,
            updated_at: now,
            theme: "system" as const,
            email_notifications: true,
            push_notifications: true,
            marketing_emails: false,
            security_alerts: true,
            carbon_aware: true,
          },
        }
      : null;

    return {
      user: userWithDefaults,
      isLoading:
        isLoading || loginMutation.isPending || signupMutation.isPending,
      isAuthenticated: !!user,
      login,
      logout,
      signup,
    };
  }, [
    user,
    isLoading,
    loginMutation.isPending,
    signupMutation.isPending,
    login,
    logout,
    signup,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Higher Order Component for protecting routes
export const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
) => {
  const WithAuth: React.FC<P> = (props) => {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        // Redirect to login if not authenticated
        router.push("/login");
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // or a loading/redirect component
    }

    return <WrappedComponent {...(props as P)} />;
  };

  return WithAuth;
};
