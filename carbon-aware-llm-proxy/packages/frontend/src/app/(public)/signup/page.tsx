"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";
import { toast } from "@/lib/toast";

function SignupPageContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup } = useAuth();

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      toast.error({
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error({
        title: "Error",
        description: "Passwords do not match",
      });
      return;
    }

    // Validate password requirements
    if (password.length < 8) {
      toast.error({
        title: "Error",
        description: "Password must be at least 8 characters long",
      });
      return;
    }
    if (!/[a-z]/.test(password)) {
      toast.error({
        title: "Error",
        description: "Password must contain at least one lowercase letter",
      });
      return;
    }
    if (!/[A-Z]/.test(password)) {
      toast.error({
        title: "Error",
        description: "Password must contain at least one uppercase letter",
      });
      return;
    }
    if (!/[0-9]/.test(password)) {
      toast.error({
        title: "Error",
        description: "Password must contain at least one number",
      });
      return;
    }

    if (!termsAccepted) {
      toast.error({
        title: "Error",
        description: "You must accept the terms and conditions",
      });
      return;
    }

    setIsLoading(true);

    try {
      await signup(email, password, name);
      // The AuthProvider will handle the redirect
    } catch (error) {
      console.error("Signup error:", error);
      toast.error({
        title: "Signup failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during signup",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const redirectToProvider = (provider: "google" | "microsoft" | "facebook") => {
    const next = encodeURIComponent(redirectTo);
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    window.location.href = `${base}/v1/auth/oauth/${provider}?next=${next}`;
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="grid gap-6">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                disabled={isLoading}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                disabled={isLoading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="flex items-start space-x-2">
              <div className="flex h-5 items-center">
                <input
                  id="terms"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
              </div>
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !termsAccepted}
              className="w-full"
            >
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Account
            </Button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            variant="outline"
            type="button"
            disabled={isLoading}
            onClick={() => redirectToProvider("google")}
          >
            Continue with Google
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={isLoading}
            onClick={() => redirectToProvider("microsoft")}
          >
            Continue with Microsoft
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={isLoading}
            onClick={() => redirectToProvider("facebook")}
          >
            Continue with Facebook
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageContent />
    </Suspense>
  );
}
