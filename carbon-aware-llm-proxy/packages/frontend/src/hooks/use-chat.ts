import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatService } from "@/services/chat-service";
import { queryKeys } from "@/lib/query-client";
import { Message } from "@/services/chat-service";
import { useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiPost } from "@/lib/api-client";

export function useChatHistory() {
  return useQuery({
    queryKey: queryKeys.chat.history,
    queryFn: async () => {
      // Load chat history from localStorage
      try {
        const stored = localStorage.getItem('chat-history');
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error('Failed to load chat history:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSaveToHistory() {
  const queryClient = useQueryClient();

  return useCallback((conversation: any) => {
    try {
      const existing = JSON.parse(localStorage.getItem('chat-history') || '[]');
      const existingIndex = existing.findIndex((c: any) => c.id === conversation.id);

      if (existingIndex >= 0) {
        existing[existingIndex] = conversation;
      } else {
        existing.unshift(conversation);
      }

      // Keep only last 50 conversations
      const limited = existing.slice(0, 50);
      localStorage.setItem('chat-history', JSON.stringify(limited));

      // Invalidate query to refresh UI
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.history });
    } catch (error) {
      console.error('Failed to save conversation to history:', error);
    }
  }, [queryClient]);
}

import { modelService } from "../services/model-service";
import { estimateCarbonGPU } from "../utils/carbon-estimator";

export function useSendMessage() {
  return useMutation({
    mutationFn: async (params: {
      messages: Message[];
      modelId: string;
      carbonAware: boolean;
    }) => {
      const { messages, modelId, carbonAware } = params;
      const response = await apiPost("/v1/chat/completions", {
        deploymentId: modelId,
        messages: messages.map(({ role, content }) => ({ role, content })),
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
        greenWeight: carbonAware ? 1 : 0,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const completionResponse = response.data;
      if (
        completionResponse &&
        completionResponse.choices &&
        completionResponse.choices.length > 0
      ) {
        const message = completionResponse.choices[0].message;

        // Gather token usage (fallback to rough estimates if missing)
        const promptTokens = completionResponse.usage?.prompt_tokens;
        const completionTokens = completionResponse.usage?.completion_tokens;

        // If usage is unavailable, fall back to simple approximations
        const approxTokensIn =
          promptTokens ?? Math.ceil((messages.map(m => m.content).join(" ").length || 0) / 4);
        const approxTokensOut =
          completionTokens ?? Math.ceil((message.content?.length || 0) / 4);

        // Get current grid carbon intensity (g/kWh) for EF; fallback to 67 g/kWh
        const ci = await modelService.getCurrentCarbonIntensity();
        const ef_g_per_kwh = ci?.carbon_intensity_gco2e_per_kwh ?? 67;

        const est = estimateCarbonGPU({
          tokensIn: approxTokensIn,
          tokensOut: approxTokensOut,
          ef: { value: ef_g_per_kwh, units: "g_per_kwh" },
          // Use coefficients path by default (can be tuned later per SKU)
          coeffs: { eInWhPerTok: 0.0003, eOutWhPerTok: 0.0004 },
          multipliers: { sku: 1.0, quant: 1.0, batching: 1.0 },
          idleWhPerPrompt: 0.02,
          PUE: 1.2,
          // Provide defaults to allow avg power estimation if no runtime
          defaultsForPower: { tpsPrefill: 18000, tpsDecode: 450 },
        });

        const carbonFootprint = {
          emissions: est.carbon_g, // grams
          energy: est.energy_total_Wh / 1000, // kWh
          intensity: ef_g_per_kwh, // g/kWh
          powerW: est.avg_power_W,
        } as const;

        return {
          ...message,
          carbonFootprint,
          tokenCount: completionResponse.usage?.total_tokens,
          // Keep these for any consumers expecting them
          energyUsage: carbonFootprint.energy,
        };
      }

      return null;
    },
  });
}

export function useStreamMessage() {
  const queryClient = useQueryClient();

  return useCallback(
    async ({
      messages,
      modelId,
      onChunk,
      temperature = 0.7,
      maxTokens = 1000,
    }: {
      messages: Message[];
      modelId: string;
      onChunk: (chunk: string) => void;
      temperature?: number;
      maxTokens?: number;
    }) => {
      return chatService.streamMessage(messages, modelId, onChunk, {
        temperature,
        maxTokens,
      });
    },
    [],
  );
}

interface CreateConversationParams {
  initialMessage?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateConversationParams) => {
      if (!user) {
        throw new Error("User must be authenticated to create a conversation");
      }

      const response = await apiPost("/api/conversations", {
        title: params.initialMessage
          ? `Chat about "${params.initialMessage.substring(0, 30)}..."`
          : "New Chat",
        modelId: params.modelId,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
      });

      return response;
    },
    onSuccess: () => {
      // Invalidate the chat history query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: [queryKeys.chat.history] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      // In a real app, this would delete the conversation on the server
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate the chat history query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.history });
    },
  });
}
