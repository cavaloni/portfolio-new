export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
}

export interface Message {
  id: string;
  content: string;
  role: MessageRole;
  timestamp: string;
  conversationId?: string;
  model?: string;
  carbonFootprint?: {
    emissions: number;
    energy: number;
    intensity: number;
  };
  isStreaming?: boolean;
  tokens?: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxTokens: number;
  trainingData: string;
  knowledgeCutoff: string;
  description: string;
  capabilities: string[];
  carbonIntensity: {
    min: number;
    avg: number;
    max: number;
  };
  latency: {
    min: number;
    avg: number;
    max: number;
  };
  isRecommended?: boolean;
  isCarbonAware?: boolean;
  lastUpdated?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  messages: Message[];
  model?: string;
  totalCarbonFootprint?: number;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
}

export interface SendMessageParams {
  content: string;
  conversationId?: string;
  model?: string;
}

export interface ChatResponse {
  message: Message;
  conversation: Conversation;
}
