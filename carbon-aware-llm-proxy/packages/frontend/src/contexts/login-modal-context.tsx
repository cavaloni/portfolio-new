"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type LoginModalContextType = {
  isOpen: boolean;
  open: (opts?: { reason?: string }) => void;
  close: () => void;
};

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined);

export function LoginModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return (
    <LoginModalContext.Provider value={value}>{children}</LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const ctx = useContext(LoginModalContext);
  if (!ctx) throw new Error("useLoginModal must be used within a LoginModalProvider");
  return ctx;
}
