"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { WebSocketProvider } from "@/contexts/websocket-context";
import { LoginModalProvider } from "@/contexts/login-modal-context";
import { LoginModal } from "@/components/auth/login-modal";

export function Providers({ children, ...props }: ThemeProviderProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <NextThemesProvider {...props}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LoginModalProvider>
            <WebSocketProvider>
              {children}
              {/* Mount login modal at root so it can be opened from anywhere */}
              <LoginModal />
            </WebSocketProvider>
          </LoginModalProvider>
        </AuthProvider>
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
