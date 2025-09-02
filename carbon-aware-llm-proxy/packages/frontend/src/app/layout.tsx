import { Providers } from "@/components/providers";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/toaster";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Carbon-Aware LLM Proxy",
  description:
    "A proxy that routes LLM requests to the most carbon-efficient models",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`glass-theme min-h-screen bg-background font-sans antialiased ${manrope.variable}`}
      >
        <Providers
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="min-h-screen flex flex-col">
            <div className="w-full border-b">
              <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center ml-1">
                  <svg
                  className="h-6 w-6 sm:h-7 sm:w-7 text-foreground/80"
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
                  <span className="ml-2 text-xl sm:text-2xl font-thin text-foreground/60">
                    Routly
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                </div>
              </div>
            </div>
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
