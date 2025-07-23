"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { WebSocketProvider } from "@/contexts/websocket-context";

export function Providers({ children, ...props }: ThemeProviderProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <NextThemesProvider {...props}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WebSocketProvider>{children}</WebSocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
