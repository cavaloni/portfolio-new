import { Metadata } from "next";
import dynamic from "next/dynamic";

// Export metadata for SEO
export const metadata: Metadata = {
  title: "Carbon-Aware Chat",
  description: "AI chat with carbon-aware routing to optimize environmental impact",
};

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

export default function ChatPage() {
  return <ChatPageClient />;
}