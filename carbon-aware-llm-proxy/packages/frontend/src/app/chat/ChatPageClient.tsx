"use client";

import { BackgroundFog } from "@/components/background-fog";
import { ChatHistorySidebar } from "@/components/chat/chat-history-sidebar";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatProgressIndicator } from "@/components/chat/chat-progress";
import { JoystickGuideModal } from "@/components/chat/JoystickGuideModal";
import { PromptSuggestions } from "@/components/chat/prompt-suggestions";
import { TimeoutHandler } from "@/components/chat/timeout-handler";
import { Globe } from "@/components/globe";
import { QuadrantJoystick } from "@/components/quadrant-joystick";
import { QuadrantPosition } from "@/components/quadrant-joystick/QuadrantJoystick.types";
import { ResponsiveSidebar, SidebarContent } from "@/components/responsive-sidebar";
import { useChatHistory } from "@/hooks/use-chat-history";
import { Message, MessageRole } from "@/types/chat";
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  Info,
  Leaf,
  Loader2,
  Star,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// Import smart routing services
import {
  ChatProgress,
  chatService,
  Message as ChatServiceMessage,
} from "@/services/chat-service";
import { presenceService } from "@/services/presence-service";
import {
  JoystickPosition,
  RouteResponse,
  routingService,
} from "@/services/routing-service";

interface RoutingStatus {
  isRouting: boolean;
  message?: string;
  deployment?: RouteResponse["chosen"];
  error?: string;
}

interface TimeoutState {
  isWaiting: boolean;
  expectedDelay: number;
  maxToleratedDelay: number;
  showTimeoutOptions: boolean;
}

export default function ChatPageClient() {
  const router = useRouter();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoystickExpanded, setIsJoystickExpanded] = useState(true);
  const [isDeploymentExpanded, setIsDeploymentExpanded] = useState(true);
  const [isModelLocationExpanded, setIsModelLocationExpanded] = useState(true);
  const [isChatHistoryExpanded, setIsChatHistoryExpanded] = useState(true);
  const [areOtherPanesCollapsed, setAreOtherPanesCollapsed] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [joystickPosition, setJoystickPosition] = useState<JoystickPosition>({
    x: 0,
    y: 0,
  });
  const [routingStatus, setRoutingStatus] = useState<RoutingStatus>({
    isRouting: false,
  });
  const [currentDeployment, setCurrentDeployment] = useState<
    RouteResponse["chosen"] | null
  >(null);
  const [currentRouting, setCurrentRouting] = useState<RouteResponse | null>(
    null
  );
  const [chatProgress, setChatProgress] = useState<ChatProgress | null>(null);
  const [timeoutState, setTimeoutState] = useState<TimeoutState>({
    isWaiting: false,
    expectedDelay: 0,
    maxToleratedDelay: 0,
    showTimeoutOptions: false,
  });

  useEffect(() => {
    setAreOtherPanesCollapsed(!isJoystickExpanded && !isDeploymentExpanded && !isModelLocationExpanded);
  }, [isJoystickExpanded, isDeploymentExpanded, isModelLocationExpanded]);

  // Start presence service on mount
  useEffect(() => {
    presenceService.start();
    return () => presenceService.stop();
  }, []);

  // Handle joystick changes
  const handleJoystickChange = useCallback((position: QuadrantPosition) => {
    setJoystickPosition({ x: position.x, y: position.y });
  }, []);

  // Route request based on current joystick position
  const getRouting = useCallback(async (): Promise<RouteResponse | null> => {
    setRoutingStatus({
      isRouting: true,
      message: "Finding optimal deployment...",
    });

    const result = await routingService.getRouting({
      joystick: joystickPosition,
    });

    if ("error" in result) {
      setRoutingStatus({
        isRouting: false,
        error: result.message,
        message: "Routing failed",
      });
      return null;
    }

    setRoutingStatus({
      isRouting: false,
      message: result.message,
      deployment: result.chosen,
    });

    setCurrentDeployment(result.chosen);
    return result;
  }, [joystickPosition]);

  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );

  // Agent Note: Chat History - Chat history management
  const { activeSession, createSession, updateCurrentSession } =
    useChatHistory();

  // Agent Note: Chat History - Auto-save current conversation
  useEffect(() => {
    const autoSaveConversation = async () => {
      // Only auto-save if we have messages and they're not just loading states
      if (messages.length === 0 || isLoading) return;

      try {
        if (!activeSession) {
          // Create a new session for the current conversation
          await createSession({
            initialMessage: messages[0],
          });

          // The createSession will automatically set this as the active session
          // If there are more messages, they'll be saved in the next effect run
        } else {
          // Update existing session with all current messages
          await updateCurrentSession({
            messages: messages,
            appendMessages: false, // Replace all messages
          });
        }
      } catch (error) {
        console.error("Error auto-saving conversation:", error);
        // Don't show user error for auto-save failures
      }
    };

    // Debounce auto-save to avoid excessive saves during typing/streaming
    const timeoutId = setTimeout(autoSaveConversation, 2000);
    return () => clearTimeout(timeoutId);
  }, [messages, activeSession, createSession, updateCurrentSession, isLoading]);

  // Enhanced send message with timeout handling and fallbacks
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (isLoading) return;

      // Add user message immediately
      const userMessage: Message = {
        id: `user_${Date.now()}`,
        role: MessageRole.User,
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setChatProgress(null);

      const assistantMessageId = `assistant_${Date.now()}`;
      const assistantMessagePlaceholder: Message = {
        id: assistantMessageId,
        role: MessageRole.Assistant,
        content: "",
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessagePlaceholder]);
      setStreamingMessageId(assistantMessageId);

      try {
        // Step 1: Get routing decision
        const routing = await getRouting();
        if (!routing) {
          throw new Error("Failed to get routing decision");
        }

        setCurrentRouting(routing);

        // Set up timeout state
        setTimeoutState({
          isWaiting: routing.expectedDelay > 10000, // Show timeout handler for delays > 10s
          expectedDelay: routing.expectedDelay,
          maxToleratedDelay: routing.maxToleratedDelay,
          showTimeoutOptions: false,
        });

        // Step 2: Send chat with enhanced routing
        const chatServiceMessages: ChatServiceMessage[] = [
          {
            id: userMessage.id,
            role: "user",
            content: userMessage.content,
            timestamp: userMessage.timestamp,
          },
        ];

        const result = await chatService.sendMessageWithRouting(
          chatServiceMessages,
          routing,
          joystickPosition,
          {
            temperature: 0.7,
            maxTokens: 1000,
            onProgress: (progress) => {
              setChatProgress(progress);

              // Update deployment info if available
              if (progress.deployment) {
                setCurrentDeployment({
                  id: progress.deployment.id,
                  appName: "",
                  modelId: progress.deployment.modelId,
                  region: progress.deployment.region,
                  ingressUrl: null,
                  co2_g_per_kwh: progress.deployment.co2_g_per_kwh,
                });
              }

              if (progress.status === "ready" && progress.message) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: progress.message || "" }
                      : msg
                  )
                );
              }
            },
          }
        );

        if (result.message) {
          // Convert ChatServiceMessage to Message format
          const assistantMessage: Message = {
            id: result.message.id || assistantMessageId,
            role: MessageRole.Assistant,
            content: result.message.content,
            timestamp: result.message.timestamp || new Date().toISOString(),
            model: result.message.model,
            carbonFootprint: result.message.carbonFootprint
              ? {
                  emissions: result.message.carbonFootprint,
                  energy: result.message.energyUsage || 0,
                  intensity: 0, // Mock intensity for now
                }
              : undefined,
            tokens: result.message.tokenCount,
            isStreaming: false,
          };
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? assistantMessage : msg
            )
          );
        }
      } catch (error: any) {
        console.error("Chat error:", error);

        // Show timeout options if it was a timeout
        const isTimeout =
          error.message?.includes("timeout") || error.status === 408;
        if (isTimeout && currentRouting) {
          setTimeoutState((prev) => ({
            ...prev,
            showTimeoutOptions: true,
          }));
          return; // Don't add error message yet, let user choose
        }

        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId)
        );

        setMessages((prev) => [
          ...prev,
          {
            id: `error_${Date.now()}`,
            role: MessageRole.Assistant,
            content: isTimeout
              ? "Request timed out. You can try a faster alternative or wait for the green option."
              : "Sorry, I encountered an error processing your request. Please try again.",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setRoutingStatus({ isRouting: false });
        setTimeoutState((prev) => ({ ...prev, isWaiting: false }));
        setStreamingMessageId(null);
      }
    },
    [isLoading, getRouting, joystickPosition, currentRouting]
  );

  // Timeout handling functions
  const handleTimeoutCancel = useCallback(() => {
    setTimeoutState((prev) => ({
      ...prev,
      isWaiting: false,
      showTimeoutOptions: false,
    }));
    setIsLoading(false);
    setChatProgress(null);
  }, []);

  const handleRetryFaster = useCallback(async () => {
    if (!currentRouting) return;

    // Adjust joystick towards speed (move up and right)
    const adjustedPosition = {
      x: Math.min(1, joystickPosition.x + 0.3),
      y: Math.min(1, joystickPosition.y + 0.5),
    };

    setJoystickPosition(adjustedPosition);
    setTimeoutState((prev) => ({ ...prev, showTimeoutOptions: false }));

    // Retry with faster preference
    // This will naturally use the adjusted joystick position in the next routing call
  }, [currentRouting, joystickPosition]);

  const handleKeepWaiting = useCallback(() => {
    setTimeoutState((prev) => ({ ...prev, showTimeoutOptions: false }));
    // Continue waiting - the request is still ongoing
  }, []);

  // Handle prompt suggestion selection
  const handlePromptSelect = useCallback((prompt: string) => {
    handleSendMessage(prompt);
  }, []);

  // Agent Note: Chat History - Handle chat history sidebar functions
  const handleToggleChatHistoryMaximize = useCallback(() => {
    if (areOtherPanesCollapsed) {
      // Restore all panes
      setIsJoystickExpanded(true);
      setIsDeploymentExpanded(true);
      setIsModelLocationExpanded(true);
      setIsChatHistoryExpanded(true);
    } else {
      // Collapse all other sections and expand chat history
      setIsJoystickExpanded(false);
      setIsDeploymentExpanded(false);
      setIsModelLocationExpanded(false);
      setIsChatHistoryExpanded(true);
    }
  }, [areOtherPanesCollapsed]);

  const handleSessionLoad = useCallback((sessionMessages: Message[]) => {
    // Load messages from a chat session
    setMessages(sessionMessages);
    // Note: The active session is already set by the loadSession function in the hook
  }, []);

  const handleNewChat = useCallback(async () => {
    // Save current conversation to history (to avoid losing it) without duplicating
    try {
      if (messages.length > 0) {
        if (activeSession) {
          // Update existing active session with the full conversation
          await updateCurrentSession({
            messages,
            appendMessages: false,
          });
        } else {
          // Create a new session with first message, then append the rest
          const created = await createSession({ initialMessage: messages[0] });
          if (messages.length > 1) {
            // Now that a session exists and is active in this hook, append remaining messages
            await updateCurrentSession({
              messages: messages.slice(1),
              appendMessages: true,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error saving current chat before starting new:", error);
    }

    // Start a new chat by clearing current messages and active session
    setMessages([]);

    // Clear the active session so a new one will be created next time
    try {
      const { chatHistoryService } = await import(
        "@/services/chat-history-service"
      );
      await chatHistoryService.setActiveSession(null);
    } catch (error) {
      console.error("Error clearing active session:", error);
    }
  }, [messages, activeSession, createSession, updateCurrentSession]);

  // Get preference icon
  const getPreferenceIcon = (preference?: string) => {
    switch (preference) {
      case "speed":
        return <Zap className="h-3 w-3" />;
      case "green":
        return <Leaf className="h-3 w-3" />;
      case "cost":
        return <DollarSign className="h-3 w-3" />;
      case "quality":
        return <Star className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Get preference color
  const getPreferenceColor = (preference?: string) => {
    switch (preference) {
      case "speed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "green":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cost":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "quality":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-background relative top-16 h-[94vh]">
      {/* Dynamic background fog effect */}
      <BackgroundFog joystickPosition={joystickPosition} />

      <main className="flex-1 overflow-hidden flex relative z-10">
        {/* Subtle rotated arrows background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 dark:opacity-[0.09] opacity-[0.35]"
          style={{
            backgroundImage: "url('/icons/flowing_arrows_pattern.svg')",
            backgroundSize: "420px 420px",
            transform: "rotate(5deg) scale(3) translate(10px, -108px)",
            maskImage:
              "radial-gradient(circle, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 25%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0) 60%)",
            WebkitMaskImage:
              "radial-gradient(circle, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 25%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0) 60%)",
            filter: "saturate(60%) brightness(115%)",
          }}
        />
        {/* Responsive sidebar with joystick and status */}
        <ResponsiveSidebar title="Routly">
          <SidebarContent className="glass-panel border-r-0 p-0 glass-glow h-[91vh] lg:h-[91vh]">
            {/* Collapsible header */}
            <button
              onClick={() => setIsJoystickExpanded(!isJoystickExpanded)}
              className="flex items-center justify-between w-full p-4 text-sm font-medium text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isJoystickExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>AI Preferences</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsGuideOpen(true);
                }}
                className="text-muted-foreground hover:text-primary p-1 rounded-full hover:bg-white/10"
                aria-label="Joystick guide"
              >
                <Info className="h-4 w-4" />
              </button>
            </button>

            {/* Collapsible content */}
            {isJoystickExpanded && (
              <div className="p-6 pt-0 space-y-6">
                <div className="glass glass-hover p-5">
                  <div className="flex justify-center">
                    <QuadrantJoystick
                      onChange={handleJoystickChange}
                      defaultPosition={{ x: 0, y: 0 }}
                      size={180}
                      showCoordinates={false}
                      className="glass-glow"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Model Location */}
            <button
              onClick={() => setIsModelLocationExpanded(!isModelLocationExpanded)}
              className="flex items-center justify-between w-full p-4 text-sm font-medium text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isModelLocationExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>Model Location</span>
              </div>
            </button>
            {isModelLocationExpanded && (
              <div className="p-6 pt-0 space-y-6">
                <div className="glass glass-hover p-5">
                  <div className="flex justify-center">
                    <Globe
                      activeRegion={currentDeployment?.region}
                      selectedModel={
                        currentDeployment
                          ? {
                              id: currentDeployment.modelId,
                              region: currentDeployment.region,
                            }
                          : null
                      }
                      size={180}
                      isLoading={routingStatus.isRouting}
                      className="glass-glow"
                      autoRotate={true}
                      rotationSpeed={0.015}
                      preference={routingService.getPreferenceFromJoystick(
                        joystickPosition
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Agent Note: Chat History - Chat History Section */}
            <ChatHistorySidebar
              isExpanded={isChatHistoryExpanded}
              onToggleExpanded={() =>
                setIsChatHistoryExpanded(!isChatHistoryExpanded)
              }
              onToggleMaximize={handleToggleChatHistoryMaximize}
              onSessionLoad={handleSessionLoad}
              onNewChat={handleNewChat}
              areOtherPanesCollapsed={areOtherPanesCollapsed}
            />

            {/* Joystick Guide Modal */}
            <JoystickGuideModal
              isOpen={isGuideOpen}
              onOpenChange={setIsGuideOpen}
            />
          </SidebarContent>
        </ResponsiveSidebar>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto pb-8 pt-8"
          >
            <div className="max-w-4xl mx-auto">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <h2 className="text-3xl mb-4 text-primary">
                    Which route shall we take today?
                  </h2>

                  {/* Centered Chat Input */}
                  <div className="w-full max-w-2xl mx-auto mb-8">
                    <div className="glass-panel border-0 p-6 glass-glow">
                      <ChatInput
                        onSendMessage={handleSendMessage}
                        disabled={isLoading}
                        placeholder={
                          isLoading
                            ? routingStatus.isRouting
                              ? "Routing..."
                              : "AI is responding..."
                            : "Ask anything about carbon-aware AI deployment..."
                        }
                      />
                    </div>
                  </div>

                  {/* Prompt Suggestions */}
                  <PromptSuggestions onPromptSelect={handlePromptSelect} />
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

              {/* Progress indicators (subtle and connected to message) */}
              <div className="px-0 pt-0 pb-4 space-y-2">
                <ChatProgressIndicator progress={chatProgress} />

                {timeoutState.showTimeoutOptions && (
                  <TimeoutHandler
                    isWaiting={timeoutState.isWaiting}
                    expectedDelay={timeoutState.expectedDelay}
                    maxToleratedDelay={timeoutState.maxToleratedDelay}
                    onCancel={handleTimeoutCancel}
                    onRetryFaster={handleRetryFaster}
                    onKeepWaiting={handleKeepWaiting}
                    message={chatProgress?.message}
                    deployment={
                      chatProgress?.deployment
                        ? {
                            modelId: chatProgress.deployment.modelId,
                            region: chatProgress.deployment.region,
                          }
                        : undefined
                    }
                  />
                )}

                {isLoading && !chatProgress && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      {routingStatus.isRouting
                        ? routingStatus.message ||
                          "Finding optimal deployment..."
                        : "AI is thinking..."}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Input area - enhanced with glassmorphism - only show when there are messages */}
          {messages.length > 0 && (
            <div className="glass-panel border-0 m-4 mt-0 p-6 glass-glow">
              <div className="max-w-4xl mx-auto">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  disabled={isLoading}
                  placeholder={
                    isLoading
                      ? routingStatus.isRouting
                        ? "Routing..."
                        : "AI is responding..."
                      : "Type your message..."
                  }
                />
                <div className="mt-3 text-xs text-muted-foreground text-center">
                  <p></p>
                </div>
              </div>
            </div>
          )}

          {/* Add some bottom spacing */}
          <div className="h-16"></div>
        </div>
      </main>
    </div>
  );
}
