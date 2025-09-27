"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLoginModal } from "@/contexts/login-modal-context";

const STORAGE_KEY = "free_prompts_used";
const LIMIT = 5;

export function useFreePromptsGate() {
  const { open: openLoginModal } = useLoginModal();
  const [used, setUsed] = useState<number>(0);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const num = raw ? parseInt(raw, 10) : 0;
      setUsed(Number.isFinite(num) && num >= 0 ? num : 0);
    } catch {
      setUsed(0);
    }
  }, []);

  const remaining = Math.max(0, LIMIT - used);

  const canUseFreePrompt = useMemo(() => used < LIMIT, [used]);

  const incrementFreePromptCount = useCallback(() => {
    setUsed((prev) => {
      const next = Math.min(LIMIT, prev + 1);
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, String(next));
        }
      } catch {}
      return next;
    });
  }, []);

  const resetFreePrompts = useCallback(() => {
    setUsed(0);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, "0");
      }
    } catch {}
  }, []);

  return {
    limit: LIMIT,
    used,
    remaining,
    canUseFreePrompt,
    incrementFreePromptCount,
    resetFreePrompts,
    openLoginModal,
  };
}
