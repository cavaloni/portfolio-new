"use client";

import { BackgroundFog } from "@/components/background-fog";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatProgressIndicator } from "@/components/chat/chat-progress";
import { JoystickGuideModal } from "@/components/chat/JoystickGuideModal";
import { PromptSuggestions } from "@/components/chat/prompt-suggestions";
import { TimeoutHandler } from "@/components/chat/timeout-handler";
import { Globe } from "@/components/globe";
import { QuadrantJoystick } from "@/components/quadrant-joystick";
import { QuadrantPosition } from "@/components/quadrant-joystick/QuadrantJoystick.types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Message, MessageRole } from "@/types/chat";
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  Info,
  Leaf,
  Loader2,
  MessageSquare,
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

export default function ChatPage() {
  const router = useRouter();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoystickExpanded, setIsJoystickExpanded] = useState(true);
  const [isDeploymentExpanded, setIsDeploymentExpanded] = useState(true);
  const [isModelLocationExpanded, setIsModelLocationExpanded] = useState(true);
  const [isPreferenceGuideExpanded, setIsPreferenceGuideExpanded] = useState(true);
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
    <div className="flex flex-col h-screen bg-background relative">
      {/* Dynamic background fog effect */}
      <BackgroundFog joystickPosition={joystickPosition} />

      <main className="flex-1 overflow-hidden flex relative z-10">
        {/* Left sidebar with joystick and status */}
        <div className="w-80 glass-panel border-r-0 p-0 m-4 mr-0 glass-glow h-[91vh] flex flex-col">
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
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  Current:{" "}
                  {routingService.getPreferenceFromJoystick(joystickPosition)}
                </div>
                <div className="text-xs text-muted-foreground mt-1 text-center">
                  ({joystickPosition.x.toFixed(2)},{" "}
                  {joystickPosition.y.toFixed(2)})
                </div>
              </div>
            </div>
          )}

          {/* Deployment Status */}
          <button
            onClick={() => setIsDeploymentExpanded(!isDeploymentExpanded)}
            className="flex items-center justify-between w-full p-4 text-sm font-medium text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              {isDeploymentExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span>Deployment Status</span>
            </div>
          </button>

          {isDeploymentExpanded && (
            <div className="p-6 pt-0 space-y-6">
              <div className="glass glass-hover p-5">
                {routingStatus.isRouting && (
                  <Alert className="mb-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      {routingStatus.message || "Routing request..."}
                    </AlertDescription>
                  </Alert>
                )}

                {routingStatus.error && (
                  <Alert variant="destructive" className="mb-3">
                    <AlertDescription>{routingStatus.error}</AlertDescription>
                  </Alert>
                )}

                {currentDeployment && (
                  <div className="glass-strong p-4 glass-glow">
                    <div className="flex items-center gap-2 mb-3">
                      {getPreferenceIcon(
                        routingService.getPreferenceFromJoystick(
                          joystickPosition
                        )
                      )}
                      <Badge
                        variant="secondary"
                        className={cn(
                          "glass-hover rounded-xl",
                          getPreferenceColor(
                            routingService.getPreferenceFromJoystick(
                              joystickPosition
                            )
                          )
                        )}
                      >
                        {routingService.formatRegion(currentDeployment.region)}
                      </Badge>
                    </div>

                    <div className="text-sm space-y-1">
                      <div>
                        <span className="font-medium">Model:</span>{" "}
                        {currentDeployment.modelId}
                      </div>
                      <div>
                        <span className="font-medium">CO₂:</span>{" "}
                        {currentDeployment.co2_g_per_kwh} g/kWh
                        <span className="text-xs text-muted-foreground ml-1">
                          (mock)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Model Location */}
          <button
            onClick={() =>
              setIsModelLocationExpanded(!isModelLocationExpanded)
            }
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

          {/* Preference Guide */}
          <button
            onClick={() =>
              setIsPreferenceGuideExpanded(!isPreferenceGuideExpanded)
            }
            className="flex items-center justify-between w-full p-4 text-sm font-medium text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              {isPreferenceGuideExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span>Preference Guide</span>
            </div>
          </button>
          {isPreferenceGuideExpanded && (
            <div className="p-6 pt-0 space-y-6">
              <div className="glass glass-hover p-5 text-xs text-muted-foreground">
                <p className="font-semibold mb-3 text-primary">Joystick Guide:</p>
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <span className="font-medium text-green-400">←</span> Green
                    (Low Carbon)
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-medium text-purple-400">→</span> Quality
                    (Best Model)
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-medium text-blue-400">↑</span> Speed
                    (Fast Response)
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-medium text-orange-400">↓</span> Cost
                    (Economical)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Joystick Guide Modal */}
          <JoystickGuideModal
            isOpen={isGuideOpen}
            onOpenChange={setIsGuideOpen}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto pb-8 pt-8"
          >
            <div className="max-w-4xl mx-auto">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="glass-strong glass-glow p-6 rounded-full mb-6">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
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
