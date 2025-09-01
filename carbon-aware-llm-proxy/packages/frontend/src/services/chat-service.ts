import { apiPost, withAuth } from "@/lib/api-client";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  timestamp?: string;
  carbonFootprint?: number;
  energyUsage?: number;
  tokenCount?: number;
  isStreaming?: boolean;
}

export interface ChatCompletionRequest {
  deploymentId: string; // Primary deployment
  fallbackIds?: string[]; // NEW: Fallback deployment IDs
  timeoutStrategy?: 'quick' | 'patient' | 'fallback'; // NEW: Timeout strategy
  expectedDelay?: number; // NEW: Expected cold start delay
  greenWeight?: number; // NEW: For timeout calculation
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  model?: string; // Optional since derived from deployment
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: Message;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  carbon_footprint?: {
    emissions_gco2e: number;
    energy_consumed_kwh: number;
  };
}

// NEW: Interface for tracking chat progress
export interface ChatProgress {
  status: 'routing' | 'deploying' | 'fallback' | 'ready' | 'error';
  message: string;
  deployment?: {
    id: string;
    modelId: string;
    region: string | null;
    co2_g_per_kwh: number;
  };
  estimatedWait?: number;
  usedFallback?: boolean;
  fallbackIndex?: number;
}

// NEW: Enhanced options for chat service
export interface EnhancedChatOptions {
  temperature?: number;
  maxTokens?: number;
  onProgress?: (progress: ChatProgress) => void;
  timeoutOverride?: number;
}

export const chatService = {
  // NEW: Enhanced method that works with routing service and fallback chains
  async sendMessageWithRouting(
    messages: Message[],
    routing: {
      chosen: { id: string; modelId: string; region: string | null; co2_g_per_kwh: number };
      fallbackOptions: Array<{ id: string; modelId: string; region: string | null; co2_g_per_kwh: number }>;
      timeoutStrategy: 'quick' | 'patient' | 'fallback';
      expectedDelay: number;
      maxToleratedDelay: number;
    },
    joystickPosition: { x: number; y: number },
    options: EnhancedChatOptions = {}
  ): Promise<{ message: Message | null; metadata: { usedFallback: boolean; fallbackIndex?: number } }> {
    const { temperature = 0.7, maxTokens = 1000, onProgress, timeoutOverride } = options;

    // Calculate green weight from joystick position (clamped to 0..1)
    const greenWeight = Math.min(1, Math.max(0, -joystickPosition.x));

    // Prepare fallback chain
    const fallbackIds = routing.fallbackOptions.slice(0, 3).map(f => f.id); // Limit to top 3

    // Notify progress
    onProgress?.({
      status: 'deploying',
      message: routing.expectedDelay > 30000 
        ? `Preparing ${routing.chosen.modelId} deployment. This may take up to ${Math.round(routing.expectedDelay / 1000)}s...`
        : `Connecting to ${routing.chosen.modelId}...`,
      deployment: routing.chosen,
      estimatedWait: routing.expectedDelay,
    });

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...withAuth(),
          },
          body: JSON.stringify({
            deploymentId: routing.chosen.id,
            fallbackIds,
            timeoutStrategy: routing.timeoutStrategy,
            expectedDelay: routing.expectedDelay,
            greenWeight,
            messages: messages.map(({ role, content }) => ({ role, content })),
            temperature,
            max_tokens: maxTokens,
            stream: true,
          }),
          // Use custom timeout if provided, otherwise let backend handle it
          ...(timeoutOverride && { signal: AbortSignal.timeout(timeoutOverride) }),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        onProgress?.({
          status: 'error',
          message: error.message || "Failed to stream response",
        });
        throw new Error(error.message || "Failed to stream response");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = "";
      let done = false;
      let usedFallback = false;
      let fallbackIndex: number | undefined = undefined;
      let actualModel = routing.chosen.modelId;
      let actualRegion = routing.chosen.region;
      let actualCo2 = routing.chosen.co2_g_per_kwh;
      let messageId = `msg_${Date.now()}`;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            if (line === "data: [DONE]") {
              done = true;
              break;
            }
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'metadata') {
                usedFallback = data.usedFallback;
                fallbackIndex = data.fallbackIndex;
                actualModel = data.model;
                actualRegion = data.region;
                actualCo2 = parseFloat(data.co2);

                onProgress?.({
                  status: 'ready',
                  message: `Connected to ${actualModel} in ${actualRegion}.`,
                  deployment: {
                    id: usedFallback && fallbackIndex !== undefined
                      ? fallbackIds[fallbackIndex - 1] || routing.chosen.id
                      : routing.chosen.id,
                    modelId: actualModel,
                    region: actualRegion,
                    co2_g_per_kwh: actualCo2,
                  },
                  usedFallback,
                  fallbackIndex,
                });
              } else {
                const chunk = data.choices?.[0]?.delta?.content || "";

                if (chunk) {
                  content += chunk;
                  onProgress?.({
                    status: 'ready',
                    message: content,
                    deployment: {
                      id: usedFallback && fallbackIndex !== undefined
                        ? fallbackIds[fallbackIndex - 1] || routing.chosen.id
                        : routing.chosen.id,
                      modelId: actualModel,
                      region: actualRegion,
                      co2_g_per_kwh: actualCo2,
                    },
                    usedFallback,
                    fallbackIndex,
                  });
                }
              }
            } catch (e) {
              console.error("Error parsing chunk:", e);
            }
          }
        }
      }

      const assistantMessage: Message = {
        id: messageId,
        role: "assistant",
        content: content,
        model: actualModel,
        timestamp: new Date().toISOString(),
        carbonFootprint: undefined, // Not available in stream
        energyUsage: undefined, // Not available in stream
        tokenCount: undefined, // Not available in stream
      };

      return {
        message: assistantMessage,
        metadata: {
          usedFallback,
          fallbackIndex,
        },
      };
    } catch (error: any) {
      console.error("Error sending message with routing:", error);
      
      const isTimeout = error.name === 'TimeoutError' || error.message?.includes('timeout') || error.status === 408;
      
      onProgress?.({
        status: 'error',
        message: isTimeout 
          ? "Request timed out. All deployments may be experiencing delays."
          : error.message || "Failed to send message",
      });
      
      throw error;
    }
  },

  async streamMessage(
    messages: Message[],
    deploymentId: string, // Changed from modelId to deploymentId
    onChunk: (chunk: string) => void,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {},
  ): Promise<Message> {
    const { temperature = 0.7, maxTokens = 1000 } = options;
    const messageId = `msg_${Date.now()}`;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...withAuth(),
          },
          body: JSON.stringify({
            deploymentId,
            messages: messages.map(({ role, content }) => ({ role, content })),
            temperature,
            max_tokens: maxTokens,
            stream: true,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to stream response");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = "";
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line === "data: [DONE]") {
            done = true;
            break;
          }

          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              const chunk = data.choices?.[0]?.delta?.content || "";

              if (chunk) {
                content += chunk;
                onChunk(chunk);
              }
            } catch (e) {
              console.error("Error parsing chunk:", e);
            }
          }
        }
      }

      // Return the complete message
      return {
        id: messageId,
        role: "assistant",
        content,
        model: deploymentId, // Use deploymentId as model identifier for now
        timestamp: new Date().toISOString(),
        // Note: For streaming, we don't get carbon/energy data in the response
        // You might want to make a separate API call to get this data
      };
    } catch (error) {
      console.error("Error streaming message:", error);
      throw error;
    }
  },
};
