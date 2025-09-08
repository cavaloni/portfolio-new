"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";
import { toast } from "@/lib/toast";

function LoginPageContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get("next") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast.error({
        title: "Error",
        description: "Please enter the password",
      });
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("next", redirectTo);

      const response = await fetch("/api/login", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // Redirect will happen automatically via the API response
        router.push(redirectTo);
      } else {
        toast.error({
          title: "Login failed",
          description: "Invalid password",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error({
        title: "Login failed",
        description: "An error occurred during login",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Demo Access
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the demo password to access the application
        </p>
      </div>

      <div className="grid gap-6">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Demo Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter demo password"
                autoComplete="current-password"
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Access Demo
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
