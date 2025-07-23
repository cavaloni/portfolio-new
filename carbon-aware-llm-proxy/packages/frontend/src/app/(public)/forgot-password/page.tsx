"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";
import { useRequestPasswordReset } from "@/hooks/use-auth";
import { toast } from "@/lib/toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { mutate: requestReset, isPending } = useRequestPasswordReset();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error({
        title: "Error",
        description: "Please enter your email address",
      });
      return;
    }

    requestReset(email, {
      onSuccess: () => {
        setIsSubmitted(true);
        toast.success({
          title: "Email sent",
          description: "Check your email for a link to reset your password.",
        });
      },
      onError: (error) => {
        console.error("Password reset request error:", error);
        toast.error({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to send reset email",
        });
      },
    });
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Icons.mail className="mx-auto h-12 w-12 text-green-500" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We've sent a password reset link to {email}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            If you don't see the email, check your spam folder.
          </p>
          <Button asChild variant="link" className="mt-4">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Forgot your password?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>

      <div className="text-center text-sm">
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
