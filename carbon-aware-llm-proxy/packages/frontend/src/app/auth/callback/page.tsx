"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Backend already set the HttpOnly cookie. Respect optional redirect param.
    const next = searchParams.get("next") || "/dashboard";
    const timer = setTimeout(() => {
      router.replace(next);
    }, 500);
    return () => clearTimeout(timer);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
