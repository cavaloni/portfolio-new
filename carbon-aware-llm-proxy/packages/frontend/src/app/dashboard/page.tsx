import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const AUTH_COOKIE = "auth_token";

// Export metadata for SEO
export const metadata: Metadata = {
  title: "Dashboard - Carbon-Aware LLM Proxy",
  description: "Your carbon-aware AI dashboard",
};

export default function DashboardPage() {
  // Check authentication on server side
  const cookieStore = cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE);

  console.log("📊 Dashboard page auth check:", {
    hasCookie: !!authCookie,
    cookieValue: authCookie?.value ? 'JWT token present' : undefined
  });

  // If no valid auth cookie, redirect to login
  if (!authCookie || !authCookie.value) {
    console.log("📊 No valid auth, redirecting to login");
    redirect("/login?next=/dashboard");
  }

  console.log("📊 Valid auth found, showing dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-8">
        <h1 className="text-4xl font-bold text-center sm:text-5xl md:text-6xl">
          Welcome to Your Dashboard
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl">
          You're successfully authenticated! This is your carbon-aware AI dashboard.
        </p>

        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/chat">Start Chatting</Link>
          </Button>
          
          <Button asChild variant="outline" size="lg">
            <Link href="/">Home</Link>
          </Button>
        </div>

        <div className="mt-16 p-6 border rounded-lg bg-card">
          <h2 className="text-2xl font-semibold mb-4">Quick Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-green-600">0 kg</div>
              <div className="text-sm text-muted-foreground">CO₂ Saved</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">0</div>
              <div className="text-sm text-muted-foreground">Chats</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">0%</div>
              <div className="text-sm text-muted-foreground">Green Routing</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
