import { Metadata } from "next";
import dynamic from "next/dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const AUTH_COOKIE = "demo_auth";

// Export metadata for SEO
export const metadata: Metadata = {
  title: "Carbon-Aware Chat",
  description: "AI chat with carbon-aware routing to optimize environmental impact",
};

export default function ChatPage() {
  // Check authentication on server side
  const cookieStore = cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE);

  console.log("💬 Chat page auth check:", {
    hasCookie: !!authCookie,
    cookieValue: authCookie?.value
  });

  // If no valid auth cookie, redirect to login
  if (!authCookie || authCookie.value !== "ok") {
    console.log("💬 No valid auth, redirecting to login");
    redirect("/login?next=/chat");
  }

  console.log("💬 Valid auth found, showing chat page");

  // Dynamically import the chat component with SSR disabled
  const ChatPageClient = dynamic(() => import("./ChatPageClient"), {
    ssr: false,
    loading: () => (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-foreground">Loading chat...</p>
        </div>
      </div>
    ),
  });

  return <ChatPageClient />;
}