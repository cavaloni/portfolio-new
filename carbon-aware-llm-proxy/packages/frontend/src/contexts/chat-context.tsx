"use client";

import {
  useCreateConversation,
  useSendMessage,
  useStreamMessage,
} from "@/hooks/use-chat";
import { useCarbonAwareModels } from "@/hooks/use-models";
import { Message } from "@/services/chat-service";
import { Model } from "@/services/model-service";
import { useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./auth-context";

interface ChatContextType {
  // Messages and conversation state
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  error: Error | null;

  // Model selection
  selectedModel: Model | null;
  setSelectedModel: (model: Model) => void;
  availableModels: Model[];
  isModelsLoading: boolean;

  // Chat actions
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  clearChat: () => void;

  // Carbon awareness
  isCarbonAware: boolean;
  toggleCarbonAware: () => void;
  carbonIntensity: number | null;

  // Conversation management
  currentConversationId: string | null;
  createNewConversation: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();

  // Get available models, sorted by carbon efficiency
  const { models: availableModels, isLoading: isModelsLoading } =
    useCarbonAwareModels();

  // State for messages and input
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [isCarbonAware, setIsCarbonAware] = useState(true);
  const [carbonIntensity, setCarbonIntensity] = useState<number | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);

  // Select the most carbon-efficient model by default
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  // Update selected model when models are loaded
  useEffect(() => {
    if (availableModels.length > 0 && !selectedModel) {
      setSelectedModel(availableModels[0]);
    }
  }, [availableModels, selectedModel]);

  // Chat mutation hooks
  const { mutateAsync: sendMessage, isPending: isSending } = useSendMessage();
  const streamMessage = useStreamMessage();
  const { mutateAsync: createConversation } = useCreateConversation();

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!input.trim() || !selectedModel) return;

      // Add user message to chat
      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "user",
        content: input,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      // Create a new conversation if this is the first message
      if (!currentConversationId) {
        try {
          const response = await createConversation({
            initialMessage: input,
            modelId: selectedModel.id,
            temperature: 0.7,
            maxTokens: 1000,
          });

          if (response.error) {
            throw new Error(
              response.error.message || "Failed to create conversation"
            );
          }

          if (!response.data?.id) {
            throw new Error("Invalid conversation data received");
          }

          setCurrentConversationId(response.data.id);
        } catch (err) {
          console.error("Error creating conversation:", err);
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to create conversation")
          );
          return;
        }
      }

      // Prepare the assistant message (initially empty)
      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: "",
        model: selectedModel.id,
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // For now, we'll use the non-streaming version
        // In a real app, you might want to use the streaming version for better UX
        const response = await sendMessage({
          messages: [...messages, userMessage],
          modelId: selectedModel.id,
          carbonAware: isCarbonAware,
        });

        if (response) {
          // Update the assistant message with the response
          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];

            if (lastMessage.role === "assistant") {
              return [
                ...updated.slice(0, -1),
                {
                  ...lastMessage,
                  content: response.content || "",
                  carbonFootprint: response.carbonFootprint,
                  energyUsage: response.energyUsage,
                  tokenCount: response.tokenCount,
                  isStreaming: false,
                },
              ];
            }

            return updated;
          });
        }
      } catch (err) {
        console.error("Error sending message:", err);
        setError(
          err instanceof Error ? err : new Error("Failed to send message")
        );

        // Remove the loading message if there was an error
        setMessages((prev) => prev.filter((msg) => !msg.isStreaming));
      }
    },
    [
      input,
      selectedModel,
      messages,
      currentConversationId,
      createConversation,
      sendMessage,
      isCarbonAware,
    ]
  );

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  // Clear the chat
  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
  }, []);

  // Toggle carbon awareness
  const toggleCarbonAware = useCallback(() => {
    setIsCarbonAware((prev) => !prev);
  }, []);

  // Create a new conversation
  const handleCreateNewConversation = useCallback(async () => {
    try {
      if (!user) {
        throw new Error("User must be logged in to create a conversation");
      }

      if (!selectedModel) {
        throw new Error("No model selected");
      }

      const response = await createConversation({
        initialMessage: input,
        modelId: selectedModel.id,
        temperature: 0.7, // Default temperature
        maxTokens: 1000, // Default max tokens
        // carbonAware: isCarbonAware,
      });

      if (response.error) {
        throw new Error(
          response.error.message || "Failed to create conversation"
        );
      }

      if (!response.data?.id) {
        throw new Error("Invalid conversation data received");
      }

      setCurrentConversationId(response.data.id);
      setMessages([]);
      return response.data;
    } catch (err) {
      console.error("Error creating new conversation:", err);
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to create new conversation")
      );
      throw err;
    }
  }, [createConversation, input, selectedModel, isCarbonAware, user]);

  // Context value
  const value = {
    messages,
    setMessages,
    input,
    setInput,
    isLoading: isSending,
    error,
    selectedModel,
    setSelectedModel,
    availableModels,
    isModelsLoading,
    handleSubmit,
    handleInputChange,
    clearChat,
    isCarbonAware,
    toggleCarbonAware,
    carbonIntensity,
    currentConversationId,
    createNewConversation: handleCreateNewConversation,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
