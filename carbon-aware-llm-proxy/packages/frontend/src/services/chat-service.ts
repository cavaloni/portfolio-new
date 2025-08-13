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
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  model: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  carbon_aware?: boolean;
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

export const chatService = {
  async sendMessage(
    messages: Message[],
    modelId: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      carbonAware?: boolean;
    } = {},
  ): Promise<Message | null> {
    const { temperature = 0.7, maxTokens = 1000, carbonAware = true } = options;

    try {
      const response = await apiPost<ChatCompletionResponse>(
        "/v1/chat/completions",
        {
          messages: messages.map(({ role, content }) => ({ role, content })),
          model: modelId,
          temperature,
          max_tokens: maxTokens,
          carbon_aware: carbonAware,
          stream: false,
        },
        { headers: withAuth() },
      );

      if (response.error) {
        throw new Error(response.error.message);
      }

      const assistantMessage = response.data?.choices?.[0]?.message;
      if (!assistantMessage) {
        throw new Error("No response from the model");
      }

      return {
        id: assistantMessage.id || `msg_${Date.now()}`,
        role: "assistant",
        content: assistantMessage.content,
        model: modelId,
        timestamp: new Date().toISOString(),
        carbonFootprint: response.data?.carbon_footprint?.emissions_gco2e,
        energyUsage: response.data?.carbon_footprint?.energy_consumed_kwh,
        tokenCount: response.data?.usage?.total_tokens,
      };
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  async streamMessage(
    messages: Message[],
    modelId: string,
    onChunk: (chunk: string) => void,
    options: {
      temperature?: number;
      maxTokens?: number;
      carbonAware?: boolean;
    } = {},
  ): Promise<Message> {
    const { temperature = 0.7, maxTokens = 1000, carbonAware = true } = options;
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
            messages: messages.map(({ role, content }) => ({ role, content })),
            model: modelId,
            temperature,
            max_tokens: maxTokens,
            carbon_aware: carbonAware,
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
        model: modelId,
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
