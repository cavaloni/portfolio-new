"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLoginModal } from "@/contexts/login-modal-context";
import { userService } from "@/services/user-service";

export function useFreePromptsGate() {
  const { open: openLoginModal } = useLoginModal();
  const [used, setUsed] = useState<number>(0);
  const [limit, setLimit] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch credits from backend on mount and periodically
  const fetchCredits = useCallback(async () => {
    try {
      const user = await userService.getCurrentUser();
      
      if (user && "isAnonymous" in user && user.isAnonymous) {
        setLimit(user.creditsLimit);
        setUsed(user.creditsUsed);
      } else if (user) {
        // Authenticated user - no limits
        setLimit(Infinity);
        setUsed(0);
      } else {
        // Failed to fetch - use defaults
        setLimit(5);
        setUsed(0);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
      // On error, use safe defaults
      setLimit(5);
      setUsed(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const remaining = Math.max(0, limit - used);

  const canUseFreePrompt = useMemo(() => used < limit, [used, limit]);

  const incrementFreePromptCount = useCallback(() => {
    // Increment optimistically - backend will enforce the limit
    setUsed((prev) => Math.min(limit, prev + 1));
  }, [limit]);

  const resetFreePrompts = useCallback(() => {
    // Reset local state only - backend tracking persists
    setUsed(0);
  }, []);

  const refreshCredits = useCallback(() => {
    // Allow manual refresh of credit state
    return fetchCredits();
  }, [fetchCredits]);

  return {
    limit,
    used,
    remaining,
    canUseFreePrompt,
    incrementFreePromptCount,
    resetFreePrompts,
    refreshCredits,
    openLoginModal,
    isLoading,
  };
}
