"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoginPanel } from "@/components/auth/login-panel";

function LoginPageContent() {
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get("next") || "/dashboard";
  return <LoginPanel redirectTo={redirectTo} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
