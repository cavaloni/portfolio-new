"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSocket } from "@/contexts/websocket-context";
import { toast } from "@/lib/toast";
import { Message, MessageRole } from "@/types/chat";

export interface UseChatStreamOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullMessage: string) => void;
  onError?: (error: Error) => void;
}

export function useChatStream(conversationId?: string) {
  const { socket, isConnected, isInitialized } = useWebSocket();
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const messageBuffer = useRef<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!isInitialized || !isConnected || !socket) return;

    const handleChunk = (data: any) => {
      if (data.conversationId !== conversationId) return;

      const { content, done, error } = data;

      if (error) {
        console.error("Error in chat stream:", error);
        toast.error({
          title: "Streaming Error",
          description:
            error.message || "An error occurred while streaming the response",
        });
        setIsStreaming(false);
        return;
      }

      if (content) {
        messageBuffer.current.push(content);
        setCurrentMessage((prev) => ({
          id: prev?.id || data.messageId || `msg-${Date.now()}`,
          role: MessageRole.Assistant,
          content: messageBuffer.current.join(""),
          timestamp: prev?.timestamp || new Date().toISOString(),
          model: data.model || prev?.model,
          carbonFootprint: data.carbonFootprint || prev?.carbonFootprint,
          tokens: data.tokens || prev?.tokens,
        }));
      }

      if (done) {
        const fullMessage = messageBuffer.current.join("");
        messageBuffer.current = [];
        setIsStreaming(false);

        setCurrentMessage((prev) => ({
          ...prev!,
          content: fullMessage,
          timestamp: new Date().toISOString(),
          isComplete: true,
        }));

        if (abortControllerRef.current) {
          abortControllerRef.current = null;
        }
      }
    };

    const unsubscribe = socket.on("chat.chunk", handleChunk);

    return () => {
      unsubscribe();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [isConnected, conversationId, socket]);

  // Send a message and start streaming the response
  const sendMessage = useCallback(
    async (
      content: string,
      options: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        systemPrompt?: string;
        parentMessageId?: string;
        carbonAware?: boolean;
      } = {},
    ): Promise<Message | null> => {
      if (isStreaming) {
        console.warn("Already streaming a message");
        return null;
      }

      setIsStreaming(true);
      messageBuffer.current = [];

      const messageId = `msg-${Date.now()}`;
      const userMessage: Message = {
        id: messageId,
        role: MessageRole.User,
        content,
        timestamp: new Date().toISOString(),
        model: options.model,
      };

      setCurrentMessage({
        id: `temp-${Date.now()}`,
        role: MessageRole.Assistant,
        content: "",
        timestamp: new Date().toISOString(),
        model: options.model,
        isStreaming: true,
      });

      // In a real app, you would also save the user message to your state
      // and potentially to a database

      try {
        abortControllerRef.current = new AbortController();

        // Send the message via WebSocket
        if (socket) {
          socket.send("chat.message", {
            messageId,
            conversationId,
            content,
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            systemPrompt: options.systemPrompt,
            parentMessageId: options.parentMessageId,
            carbonAware: options.carbonAware,
          });
        }

        // Return the user message immediately
        return userMessage;
      } catch (error) {
        console.error("Error sending message:", error);
        setIsStreaming(false);
        setCurrentMessage(null);

        toast.error({
          title: "Error",
          description: "Failed to send message. Please try again.",
        });

        return null;
      }
    },
    [isStreaming, socket, conversationId],
  );

  // Stop the current stream
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (isStreaming && socket) {
      socket.send("chat.stop", { conversationId });
      setIsStreaming(false);

      // Finalize the current message if there's any content
      if (messageBuffer.current.length > 0) {
        const fullMessage = messageBuffer.current.join("");
        messageBuffer.current = [];

        setCurrentMessage((prev) => ({
          ...prev!,
          content: fullMessage,
          timestamp: new Date().toISOString(),
          isComplete: true,
          isStreaming: false,
        }));

        return fullMessage;
      }
    }

    return null;
  }, [isStreaming, socket, conversationId]);

  return {
    sendMessage,
    stopStreaming,
    isStreaming,
    currentMessage,
    reset: () => {
      setCurrentMessage(null);
      messageBuffer.current = [];
      setIsStreaming(false);
    },
  };
}
