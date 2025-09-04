// Agent Note: Chat History - TypeScript interfaces for chat history feature
// This file defines the data structures for chat history that will be stored in localStorage
// during the pre-alpha phase and later migrated to a database backend.

import { Message } from "./chat";

/**
 * Agent Note: Chat History - Core chat session interface
 * This interface represents a complete chat session with all its messages.
 * The structure is designed to mirror what will eventually be stored in the database.
 */
export interface ChatSession {
  /** Unique identifier for the chat session */
  id: string;
  /** Human-readable title for the chat session, derived from first message */
  title: string;
  /** ISO timestamp when the session was created */
  createdAt: string;
  /** ISO timestamp when the session was last updated */
  updatedAt: string;
  /** Array of all messages in this session */
  messages: Message[];
  /** Optional user ID for when authentication is implemented */
  userId?: string;
  /** Preview text showing the first few words of the conversation */
  preview: string;
  /** Total number of messages in the session */
  messageCount: number;
  /** Total carbon footprint for this session (sum of all message footprints) */
  totalCarbonFootprint?: number;
  /** Whether this session is currently active/selected */
  isActive?: boolean;
}

/**
 * Agent Note: Chat History - Lightweight session summary for list display
 * This interface is used for displaying chat sessions in the sidebar without
 * loading all message content, improving performance for large chat histories.
 */
export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  preview: string;
  messageCount: number;
  totalCarbonFootprint?: number;
  isActive?: boolean;
}

/**
 * Agent Note: Chat History - Parameters for creating a new chat session
 * Used when starting a new conversation or saving an existing conversation.
 */
export interface CreateChatSessionParams {
  /** Optional custom title, will be auto-generated if not provided */
  title?: string;
  /** Initial message to start the session with */
  initialMessage?: Message;
  /** Optional user ID */
  userId?: string;
}

/**
 * Agent Note: Chat History - Parameters for updating an existing chat session
 * Used when adding messages or updating session metadata.
 */
export interface UpdateChatSessionParams {
  /** Session ID to update */
  id: string;
  /** Optional new title */
  title?: string;
  /** Messages to add to the session */
  messages?: Message[];
  /** Whether to append messages or replace all messages */
  appendMessages?: boolean;
}

/**
 * Agent Note: Chat History - Chat history storage interface
 * This interface defines the structure of data stored in localStorage.
 * It's designed to be easily migrated to a database backend later.
 */
export interface ChatHistoryStorage {
  /** All chat sessions indexed by ID */
  sessions: Record<string, ChatSession>;
  /** Ordered list of session IDs (most recent first) */
  sessionOrder: string[];
  /** Currently active session ID */
  activeSessionId: string | null;
  /** Metadata about the storage */
  metadata: {
    /** Version of the storage schema for migration purposes */
    version: string;
    /** Timestamp when storage was last updated */
    lastUpdated: string;
    /** Total number of sessions */
    totalSessions: number;
  };
}

/**
 * Agent Note: Chat History - Service interface for chat history operations
 * This interface defines the contract for chat history operations that will
 * be implemented first with localStorage and later with API calls.
 */
export interface ChatHistoryService {
  /** Get all chat session summaries */
  getAllSessions(): Promise<ChatSessionSummary[]>;
  
  /** Get a specific chat session by ID */
  getSession(id: string): Promise<ChatSession | null>;
  
  /** Create a new chat session */
  createSession(params: CreateChatSessionParams): Promise<ChatSession>;
  
  /** Update an existing chat session */
  updateSession(params: UpdateChatSessionParams): Promise<ChatSession>;
  
  /** Delete a chat session */
  deleteSession(id: string): Promise<boolean>;
  
  /** Set the active session */
  setActiveSession(id: string | null): Promise<void>;
  
  /** Get the currently active session */
  getActiveSession(): Promise<ChatSession | null>;
  
  /** Clear all chat history */
  clearAllSessions(): Promise<void>;
  
  /** Export chat history for backup */
  exportHistory(): Promise<ChatHistoryStorage>;
  
  /** Import chat history from backup */
  importHistory(data: ChatHistoryStorage): Promise<void>;
}

/**
 * Agent Note: Chat History - Hook return type for chat history management
 * This interface defines what the useChatHistory hook will return.
 */
export interface ChatHistoryHookReturn {
  /** All chat session summaries */
  sessions: ChatSessionSummary[];
  
  /** Currently active session */
  activeSession: ChatSession | null;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: string | null;
  
  /** Create a new chat session */
  createSession: (params: CreateChatSessionParams) => Promise<ChatSession>;
  
  /** Load a specific session */
  loadSession: (id: string) => Promise<ChatSession | null>;
  
  /** Update the current session */
  updateCurrentSession: (params: Omit<UpdateChatSessionParams, 'id'>) => Promise<ChatSession>;

  /** Update any session by ID */
  updateSession: (params: UpdateChatSessionParams) => Promise<ChatSession>;

  /** Delete a session */
  deleteSession: (id: string) => Promise<boolean>;
  
  /** Clear all sessions */
  clearAllSessions: () => Promise<void>;
  
  /** Refresh the session list */
  refreshSessions: () => Promise<void>;
}

/**
 * Agent Note: Chat History - Constants for chat history feature
 */
export const CHAT_HISTORY_CONSTANTS = {
  /** localStorage key for storing chat history */
  STORAGE_KEY: 'carbon-aware-chat-history',
  
  /** Current version of the storage schema */
  STORAGE_VERSION: '1.0.0',
  
  /** Maximum number of sessions to keep in localStorage */
  MAX_SESSIONS: 100,
  
  /** Maximum length for session titles */
  MAX_TITLE_LENGTH: 100,
  
  /** Maximum length for session previews */
  MAX_PREVIEW_LENGTH: 150,
  
  /** Default title for new sessions */
  DEFAULT_TITLE: 'New Chat',
} as const;
