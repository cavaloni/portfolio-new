import { Providers } from "@/components/providers";
import BrandLogo from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/toaster";
import "highlight.js/styles/github-dark.min.css";
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
            <div className="w-full border-b absolute top-0 z-50">
              <div className="container ml-0 flex h-16 items-center justify-between">
                <BrandLogo scale={3} leftOffsetPx={35} className="ml-1" zIndexClass="-z-10" />
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
