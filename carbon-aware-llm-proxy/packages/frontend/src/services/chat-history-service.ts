// Agent Note: Chat History - localStorage-based chat history service
// This service provides an abstraction layer for chat history operations using localStorage.
// It's designed to be easily replaceable with API-based operations when backend is ready.

import { Message } from "@/types/chat";
import {
  ChatSession,
  ChatSessionSummary,
  CreateChatSessionParams,
  UpdateChatSessionParams,
  ChatHistoryStorage,
  ChatHistoryService,
  CHAT_HISTORY_CONSTANTS,
} from "@/types/chat-history";

/**
 * Agent Note: Chat History - localStorage implementation of ChatHistoryService
 * This class implements all chat history operations using localStorage for persistence.
 * When migrating to a database backend, this entire class can be replaced with
 * an API-based implementation that follows the same interface.
 */
class LocalStorageChatHistoryService implements ChatHistoryService {
  private storageKey = CHAT_HISTORY_CONSTANTS.STORAGE_KEY;

  /**
   * Agent Note: Chat History - Get storage data from localStorage
   * This method handles reading and parsing the chat history data from localStorage.
   * It includes error handling and initialization of empty storage if needed.
   */
  private getStorageData(): ChatHistoryStorage {
    try {
      if (typeof window === "undefined") {
        // Server-side rendering - return empty storage
        return this.createEmptyStorage();
      }

      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        return this.createEmptyStorage();
      }

      const parsed = JSON.parse(data) as ChatHistoryStorage;
      
      // Validate storage version and migrate if necessary
      if (parsed.metadata.version !== CHAT_HISTORY_CONSTANTS.STORAGE_VERSION) {
        console.warn('Chat history storage version mismatch, initializing fresh storage');
        return this.createEmptyStorage();
      }

      return parsed;
    } catch (error) {
      console.error('Error reading chat history from localStorage:', error);
      return this.createEmptyStorage();
    }
  }

  /**
   * Agent Note: Chat History - Save storage data to localStorage
   * This method handles serializing and saving chat history data to localStorage.
   * It includes error handling and storage size management.
   */
  private saveStorageData(data: ChatHistoryStorage): void {
    try {
      if (typeof window === "undefined") {
        return; // Can't save during SSR
      }

      // Update metadata
      data.metadata.lastUpdated = new Date().toISOString();
      data.metadata.totalSessions = Object.keys(data.sessions).length;

      // Enforce maximum session limit
      if (data.sessionOrder.length > CHAT_HISTORY_CONSTANTS.MAX_SESSIONS) {
        const sessionsToRemove = data.sessionOrder.slice(CHAT_HISTORY_CONSTANTS.MAX_SESSIONS);
        sessionsToRemove.forEach(sessionId => {
          delete data.sessions[sessionId];
        });
        data.sessionOrder = data.sessionOrder.slice(0, CHAT_HISTORY_CONSTANTS.MAX_SESSIONS);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(data));

      // Notify listeners that chat history changed (for cross-component sync)
      try {
        window.dispatchEvent(new CustomEvent('chat-history:changed'));
      } catch (e) {
        // no-op if event dispatch fails
      }
    } catch (error) {
      console.error('Error saving chat history to localStorage:', error);
      throw new Error('Failed to save chat history');
    }
  }

  /**
   * Agent Note: Chat History - Create empty storage structure
   * This method creates a fresh, empty storage structure with proper metadata.
   */
  private createEmptyStorage(): ChatHistoryStorage {
    return {
      sessions: {},
      sessionOrder: [],
      activeSessionId: null,
      metadata: {
        version: CHAT_HISTORY_CONSTANTS.STORAGE_VERSION,
        lastUpdated: new Date().toISOString(),
        totalSessions: 0,
      },
    };
  }

  /**
   * Agent Note: Chat History - Generate session title from first message
   * This utility method creates a human-readable title from the first user message.
   */
  private generateSessionTitle(messages: Message[]): string {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) {
      return CHAT_HISTORY_CONSTANTS.DEFAULT_TITLE;
    }

    const title = firstUserMessage.content
      .trim()
      .substring(0, CHAT_HISTORY_CONSTANTS.MAX_TITLE_LENGTH)
      .replace(/\n/g, ' ');
    
    return title || CHAT_HISTORY_CONSTANTS.DEFAULT_TITLE;
  }

  /**
   * Agent Note: Chat History - Generate session preview from messages
   * This utility method creates a preview text showing the conversation flow.
   */
  private generateSessionPreview(messages: Message[]): string {
    if (messages.length === 0) {
      return 'Empty conversation';
    }

    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) {
      return 'System conversation';
    }

    const preview = firstUserMessage.content
      .trim()
      .substring(0, CHAT_HISTORY_CONSTANTS.MAX_PREVIEW_LENGTH)
      .replace(/\n/g, ' ');
    
    return preview || 'Empty message';
  }

  /**
   * Agent Note: Chat History - Calculate total carbon footprint for session
   * This utility method sums up carbon footprints from all messages in a session.
   */
  private calculateTotalCarbonFootprint(messages: Message[]): number {
    return messages.reduce((total, message) => {
      return total + (message.carbonFootprint?.emissions || 0);
    }, 0);
  }

  /**
   * Agent Note: Chat History - Convert ChatSession to ChatSessionSummary
   * This utility method creates a lightweight summary from a full session.
   */
  private sessionToSummary(session: ChatSession): ChatSessionSummary {
    return {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      preview: session.preview,
      messageCount: session.messageCount,
      totalCarbonFootprint: session.totalCarbonFootprint,
      isActive: session.isActive,
    };
  }

  // Implementation of ChatHistoryService interface methods

  async getAllSessions(): Promise<ChatSessionSummary[]> {
    const storage = this.getStorageData();
    return storage.sessionOrder.map(id => {
      const session = storage.sessions[id];
      return this.sessionToSummary(session);
    });
  }

  async getSession(id: string): Promise<ChatSession | null> {
    const storage = this.getStorageData();
    return storage.sessions[id] || null;
  }

  async createSession(params: CreateChatSessionParams): Promise<ChatSession> {
    const storage = this.getStorageData();
    const now = new Date().toISOString();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const messages = params.initialMessage ? [params.initialMessage] : [];
    const title = params.title || this.generateSessionTitle(messages);
    const preview = this.generateSessionPreview(messages);
    const totalCarbonFootprint = this.calculateTotalCarbonFootprint(messages);

    const newSession: ChatSession = {
      id: sessionId,
      title,
      createdAt: now,
      updatedAt: now,
      messages,
      userId: params.userId,
      preview,
      messageCount: messages.length,
      totalCarbonFootprint,
      isActive: false,
    };

    // Add to storage
    storage.sessions[sessionId] = newSession;
    storage.sessionOrder.unshift(sessionId); // Add to beginning (most recent first)

    // Set as active session
    storage.activeSessionId = sessionId;
    newSession.isActive = true;

    this.saveStorageData(storage);
    return newSession;
  }

  async updateSession(params: UpdateChatSessionParams): Promise<ChatSession> {
    const storage = this.getStorageData();
    const existingSession = storage.sessions[params.id];
    
    if (!existingSession) {
      throw new Error(`Session with ID ${params.id} not found`);
    }

    const now = new Date().toISOString();
    let updatedMessages = existingSession.messages;

    // Handle message updates
    if (params.messages) {
      if (params.appendMessages !== false) {
        // Append new messages (default behavior)
        updatedMessages = [...existingSession.messages, ...params.messages];
      } else {
        // Replace all messages
        updatedMessages = params.messages;
      }
    }

    // Update session
    const updatedSession: ChatSession = {
      ...existingSession,
      title: params.title || existingSession.title,
      updatedAt: now,
      messages: updatedMessages,
      preview: this.generateSessionPreview(updatedMessages),
      messageCount: updatedMessages.length,
      totalCarbonFootprint: this.calculateTotalCarbonFootprint(updatedMessages),
    };

    // If title wasn't provided and we have new messages, regenerate title
    if (!params.title && params.messages && params.messages.length > 0) {
      updatedSession.title = this.generateSessionTitle(updatedMessages);
    }

    storage.sessions[params.id] = updatedSession;

    // Move to front of session order if updated
    const currentIndex = storage.sessionOrder.indexOf(params.id);
    if (currentIndex > 0) {
      storage.sessionOrder.splice(currentIndex, 1);
      storage.sessionOrder.unshift(params.id);
    }

    this.saveStorageData(storage);
    return updatedSession;
  }

  async deleteSession(id: string): Promise<boolean> {
    const storage = this.getStorageData();
    
    if (!storage.sessions[id]) {
      return false;
    }

    delete storage.sessions[id];
    storage.sessionOrder = storage.sessionOrder.filter(sessionId => sessionId !== id);
    
    // Clear active session if it was deleted
    if (storage.activeSessionId === id) {
      storage.activeSessionId = null;
    }

    this.saveStorageData(storage);
    return true;
  }

  async setActiveSession(id: string | null): Promise<void> {
    const storage = this.getStorageData();
    
    // Clear previous active session
    if (storage.activeSessionId) {
      const prevSession = storage.sessions[storage.activeSessionId];
      if (prevSession) {
        prevSession.isActive = false;
      }
    }

    // Set new active session
    storage.activeSessionId = id;
    if (id && storage.sessions[id]) {
      storage.sessions[id].isActive = true;
    }

    this.saveStorageData(storage);
  }

  async getActiveSession(): Promise<ChatSession | null> {
    const storage = this.getStorageData();
    return storage.activeSessionId ? storage.sessions[storage.activeSessionId] || null : null;
  }

  async clearAllSessions(): Promise<void> {
    this.saveStorageData(this.createEmptyStorage());
  }

  async exportHistory(): Promise<ChatHistoryStorage> {
    return this.getStorageData();
  }

  async importHistory(data: ChatHistoryStorage): Promise<void> {
    this.saveStorageData(data);
  }
}

/**
 * Agent Note: Chat History - Singleton instance of the chat history service
 * This singleton pattern ensures consistent state management across the application.
 * When migrating to API-based operations, this can be replaced with an API service instance.
 */
export const chatHistoryService = new LocalStorageChatHistoryService();
