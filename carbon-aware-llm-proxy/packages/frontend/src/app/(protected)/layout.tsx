import { SiteFooter } from "@/components/layout/site-footer";
import { TailwindIndicator } from "@/components/theme/tailwind-indicator";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/providers/query-provider";
import { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { ReactNode } from "react";
import { Toaster } from "sonner";
import "../globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Carbon-Aware LLM Proxy",
  description: "A proxy for LLM APIs with carbon awareness",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="icon"
          href="/icon?<generated>"
          type="image/<generated>"
          sizes="<generated>"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-icon?<generated>"
          type="image/<generated>"
          sizes="<generated>"
        />
      </head>
      <body
        className={cn(
          "glass-theme min-h-screen bg-background font-sans antialiased flex flex-col",
          manrope.variable
        )}
      >
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <div className="flex flex-col min-h-screen">
                <div className="w-full border-b">
                  <div className="container flex h-16 items-center gap-2">
                    <svg
                      className="h-6 w-6 sm:h-7 sm:w-7 text-gray-700"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      role="img"
                      aria-label="Routly logo"
                    >
                      <path d="M19.5 6.5c-1.9-2.1-4.7-3.3-7.7-3.2-5 .1-9 4.3-8.8 9.3.1 3.3 2 6.2 4.8 7.7"></path>
                      <path d="M12 3 L13.2 4.2"></path>
                      <path d="M12 3 L10.8 4.2"></path>
                    </svg>
                    <span className="text-xl sm:text-2xl font-thin text-gray-300">Routly</span>
                  </div>
                </div>
                <main className="flex-1 container py-6">{children}</main>
                <SiteFooter className="border-t" />
              </div>
              <TailwindIndicator />
              <Toaster />
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
