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
      // In a real app, this would fetch the chat history from the server
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messages,
      modelId,
      temperature = 0.7,
      maxTokens = 1000,
      carbonAware = true,
    }: {
      messages: Message[];
      modelId: string;
      temperature?: number;
      maxTokens?: number;
      carbonAware?: boolean;
    }) => {
      return chatService.sendMessage(messages, modelId, {
        temperature,
        maxTokens,
        carbonAware,
      });
    },
    onSuccess: (data, variables) => {
      // In a real app, you might want to update the chat history
      // or invalidate relevant queries here
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
      carbonAware = true,
    }: {
      messages: Message[];
      modelId: string;
      onChunk: (chunk: string) => void;
      temperature?: number;
      maxTokens?: number;
      carbonAware?: boolean;
    }) => {
      return chatService.streamMessage(messages, modelId, onChunk, {
        temperature,
        maxTokens,
        carbonAware,
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
  carbonAware?: boolean;
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
        carbonAware: params.carbonAware,
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
