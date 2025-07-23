"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRole?: string;
  redirectTo?: string;
};

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store the current URL for redirecting after login
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem("redirectAfterLogin", currentPath);

      // Redirect to login page
      router.push(redirectTo);
    } else if (!isLoading && isAuthenticated && requiredRole) {
      // Check if user has the required role
      const hasRequiredRole = user?.role === requiredRole;

      if (!hasRequiredRole) {
        // Redirect to unauthorized page or home
        router.push("/unauthorized");
      }
    }
  }, [isLoading, isAuthenticated, requiredRole, user, router, redirectTo]);

  // Show loading indicator while checking auth status
  if (isLoading || (!isAuthenticated && !isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user has the required role if specified
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Access Denied
          </h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  // If authenticated and has required role, render children
  return <>{children}</>;
}

// Higher-order component for protecting routes with roles
export function withRole(
  Component: React.ComponentType,
  requiredRole?: string,
) {
  return function WithRoleWrapper(props: any) {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
