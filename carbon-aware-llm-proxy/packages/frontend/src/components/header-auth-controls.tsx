"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useLoginModal } from "@/contexts/login-modal-context";
import { useFreePromptsGate } from "@/hooks/use-free-prompts-gate";

export function HeaderAuthControls() {
  const { isAuthenticated, logout } = useAuth();
  const { open } = useLoginModal();
  const { remaining, limit } = useFreePromptsGate();

  return (
    <div className="flex items-center gap-2">
      {!isAuthenticated && (
        <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">
          {remaining}/{limit} free
        </span>
      )}
      {isAuthenticated ? (
        <Button size="sm" variant="outline" onClick={() => logout()}>
          Logout
        </Button>
      ) : (
        <Button size="sm" onClick={() => open()}>Sign in</Button>
      )}
    </div>
  );
}
