"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";
import { toast } from "@/lib/toast";
import { useAuth } from "@/contexts/auth-context";

export function LoginPanel({
  redirectTo,
  onSuccess,
  title = "Sign in",
  subtitle = "Welcome back. Choose a provider or use your email and password.",
}: {
  redirectTo?: string;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const nextTarget = useMemo(() => {
    if (redirectTo && redirectTo.length > 0) return redirectTo;
    if (typeof window !== "undefined") {
      return window.location.pathname + window.location.search;
    }
    return "/dashboard";
  }, [redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error({
        title: "Error",
        description: "Please enter email and password",
      });
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      onSuccess?.();
    } catch (error) {
      console.error("Login error:", error);
      toast.error({
        title: "Login failed",
        description:
          error instanceof Error ? error.message : "An error occurred during login",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = (provider: "google" | "microsoft" | "facebook") => {
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    const next = encodeURIComponent(nextTarget);
    window.location.href = `${base}/v1/auth/oauth/${provider}?next=${next}`;
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-6">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            variant="outline"
            type="button"
            disabled={isLoading}
            onClick={() => handleOAuth("google")}
          >
            Continue with Google
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={isLoading}
            onClick={() => handleOAuth("microsoft")}
          >
            Continue with Microsoft
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={isLoading}
            onClick={() => handleOAuth("facebook")}
          >
            Continue with Facebook
          </Button>
        </div>
      </div>
    </div>
  );
}
