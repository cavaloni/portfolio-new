"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Settings, MessageSquare, Loader2 } from "lucide-react";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { useChatStream } from "@/hooks/use-chat-stream";
import { Message, MessageRole, ModelInfo } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { QuadrantJoystick } from "@/components/quadrant-joystick";
import { QuadrantPosition } from "@/components/quadrant-joystick/QuadrantJoystick.types";

// Mock models data - replace with actual API call
const MOCK_MODELS: ModelInfo[] = [
  {
    id: "gpt-4",
    name: "GPT-4",
    provider: "OpenAI",
    contextWindow: 8192,
    maxTokens: 4096,
    trainingData: "Up to Oct 2023",
    knowledgeCutoff: "2023-10",
    description: "Most capable model, optimized for complex tasks",
    capabilities: ["text", "code"],
    carbonIntensity: {
      min: 0.4,
      avg: 0.8,
      max: 1.2,
    },
    latency: {
      min: 100,
      avg: 300,
      max: 1000,
    },
    isRecommended: true,
    isCarbonAware: true,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    contextWindow: 4096,
    maxTokens: 2048,
    trainingData: "Up to Sep 2021",
    knowledgeCutoff: "2021-09",
    description: "Balanced performance and cost",
    capabilities: ["text", "code"],
    carbonIntensity: {
      min: 0.2,
      avg: 0.4,
      max: 0.8,
    },
    latency: {
      min: 50,
      avg: 200,
      max: 500,
    },
    isRecommended: false,
    isCarbonAware: true,
    lastUpdated: new Date().toISOString(),
  },
];

export default function ChatPage() {
  const router = useRouter();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState("gpt-4");
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");

  // Fetch conversation history when component mounts
  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      try {
        // TODO: Replace with actual API call to fetch user's conversations
        return [];
      } catch (error) {
        console.error("Error fetching conversations:", error);
        return [];
      }
    },
  });

  const handleChange = (position: QuadrantPosition) => {
    // Use position for routing decisions
    console.log(
      `Selected: ${position.quadrant} at (${position.x}, ${position.y})`,
    );
  };

  // Initialize chat stream
  const {
    sendMessage: sendChatMessage,
    stopStreaming,
    isStreaming,
    currentMessage,
    reset: resetStream,
  } = useChatStream(conversationId);

  // Handle sending a new message
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setIsLoading(true);

      // Create a user message
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: MessageRole.User,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        model: selectedModel,
      };

      // Add the user message to the conversation
      setMessages((prev) => [...prev, userMessage]);

      try {
        // Send the message via WebSocket
        await sendChatMessage(content, {
          model: selectedModel,
          carbonAware: true,
        });
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedModel, sendChatMessage],
  );

  // Handle model change
  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
  }, []);

  // Update messages when a new chunk is received
  useEffect(() => {
    if (!currentMessage) return;

    setMessages((prev) => {
      // If this is a new message, add it to the list
      if (!prev.some((msg) => msg.id === currentMessage.id)) {
        return [...prev, currentMessage];
      }

      // Otherwise, update the existing message
      return prev.map((msg) =>
        msg.id === currentMessage.id ? { ...currentMessage } : msg,
      );
    });
  }, [currentMessage]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages, currentMessage]);

  // Handle stopping the current stream
  const handleStopStreaming = useCallback(() => {
    stopStreaming();
    resetStream();
  }, [stopStreaming, resetStream]);

  if (isLoadingConversations) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">Carbon-Aware Chat</h1>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div
          ref={messagesContainerRef}
          className="h-full overflow-y-auto p-4 pb-24"
        >
          <div className="max-w-3xl mx-auto space-y-1">
            {messages.length === 0 ? (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  How can I help you today?
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Ask me anything about carbon-aware AI, and I'll provide
                  answers while minimizing environmental impact.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isCurrentUser={message.role === MessageRole.User}
                />
              ))
            )}
            {isStreaming && currentMessage && (
              <ChatMessage message={currentMessage} isCurrentUser={false} />
            )}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto">
          <QuadrantJoystick
            onChange={handleChange}
            defaultPosition={{ x: 0, y: 0 }}
            showCoordinates={true}
          />
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading || isStreaming}
            placeholder={
              isStreaming ? "Generating response..." : "Type a message..."
            }
          />
          <div className="mt-2 text-xs text-muted-foreground text-center">
            <p>
              Carbon-aware AI assistant - Powered by renewable energy when
              available
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
