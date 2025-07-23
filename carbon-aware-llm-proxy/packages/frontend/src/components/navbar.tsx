import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold inline-block">Carbon-Aware LLM</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/chat"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Chat
            </Link>
            <Link
              href="/models"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Models
            </Link>
            <Link
              href="/analytics"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Analytics
            </Link>
            <Link
              href="/docs"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Documentation
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav
            className="flex items-center
          "
          >
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="ml-2">
              <Link href="/signup">Get Started</Link>
            </Button>
            <div className="ml-2">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
