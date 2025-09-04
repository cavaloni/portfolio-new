// Agent Note: Chat History - React hook for chat history management
// This hook provides a React-friendly interface for chat history operations.
// It manages state, loading, and error handling for the chat history feature.

import { useState, useEffect, useCallback } from "react";
import { chatHistoryService } from "@/services/chat-history-service";
import {
  ChatSession,
  ChatSessionSummary,
  CreateChatSessionParams,
  UpdateChatSessionParams,
  ChatHistoryHookReturn,
} from "@/types/chat-history";

/**
 * Agent Note: Chat History - Main hook for chat history management
 * This hook provides all the functionality needed to manage chat history in React components.
 * It handles loading states, error states, and provides methods for CRUD operations.
 */
export function useChatHistory(): ChatHistoryHookReturn {
  // State management
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Agent Note: Chat History - Load all sessions from storage
   * This function fetches all chat session summaries and updates the component state.
   */
  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const sessionSummaries = await chatHistoryService.getAllSessions();
      setSessions(sessionSummaries);
      
      // Load active session if one exists
      const activeSessionData = await chatHistoryService.getActiveSession();
      setActiveSession(activeSessionData);
    } catch (err) {
      console.error('Error loading chat sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chat sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Agent Note: Chat History - Create a new chat session
   * This function creates a new chat session and updates the local state.
   */
  const createSession = useCallback(async (params: CreateChatSessionParams): Promise<ChatSession> => {
    try {
      setError(null);
      
      const newSession = await chatHistoryService.createSession(params);
      
      // Update sessions list
      await loadSessions();
      
      return newSession;
    } catch (err) {
      console.error('Error creating chat session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create chat session';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [loadSessions]);

  /**
   * Agent Note: Chat History - Load a specific session and set it as active
   * This function loads a complete session by ID and sets it as the active session.
   */
  const loadSession = useCallback(async (id: string): Promise<ChatSession | null> => {
    try {
      setError(null);
      
      const session = await chatHistoryService.getSession(id);
      if (!session) {
        throw new Error(`Session with ID ${id} not found`);
      }
      
      // Set as active session
      await chatHistoryService.setActiveSession(id);
      setActiveSession(session);
      
      // Update sessions list to reflect active state
      await loadSessions();
      
      return session;
    } catch (err) {
      console.error('Error loading chat session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chat session';
      setError(errorMessage);
      return null;
    }
  }, [loadSessions]);

  /**
   * Agent Note: Chat History - Update the current active session
   * This function updates the currently active session with new data.
   */
  const updateCurrentSession = useCallback(async (
    params: Omit<UpdateChatSessionParams, 'id'>
  ): Promise<ChatSession> => {
    try {
      setError(null);

      if (!activeSession) {
        throw new Error('No active session to update');
      }

      const updatedSession = await chatHistoryService.updateSession({
        ...params,
        id: activeSession.id,
      });

      setActiveSession(updatedSession);

      // Update sessions list
      await loadSessions();

      return updatedSession;
    } catch (err) {
      console.error('Error updating chat session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update chat session';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [activeSession, loadSessions]);

  /**
   * Agent Note: Chat History - Update any session by ID
   * This function updates a specific session by ID, useful for updating non-active sessions.
   */
  const updateSession = useCallback(async (params: UpdateChatSessionParams): Promise<ChatSession> => {
    try {
      setError(null);

      const updatedSession = await chatHistoryService.updateSession(params);

      // If this is the active session, update it
      if (activeSession?.id === params.id) {
        setActiveSession(updatedSession);
      }

      // Update sessions list
      await loadSessions();

      return updatedSession;
    } catch (err) {
      console.error('Error updating chat session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update chat session';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [activeSession, loadSessions]);

  /**
   * Agent Note: Chat History - Delete a chat session
   * This function deletes a session and updates the local state.
   */
  const deleteSession = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const success = await chatHistoryService.deleteSession(id);
      
      if (success) {
        // If we deleted the active session, clear it
        if (activeSession?.id === id) {
          setActiveSession(null);
        }
        
        // Update sessions list
        await loadSessions();
      }
      
      return success;
    } catch (err) {
      console.error('Error deleting chat session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete chat session';
      setError(errorMessage);
      return false;
    }
  }, [activeSession, loadSessions]);

  /**
   * Agent Note: Chat History - Clear all chat sessions
   * This function removes all chat history and resets the state.
   */
  const clearAllSessions = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      await chatHistoryService.clearAllSessions();
      
      // Reset local state
      setSessions([]);
      setActiveSession(null);
    } catch (err) {
      console.error('Error clearing chat sessions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear chat sessions';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Agent Note: Chat History - Refresh sessions list
   * This function reloads the sessions list from storage.
   */
  const refreshSessions = useCallback(async (): Promise<void> => {
    await loadSessions();
  }, [loadSessions]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Listen for global chat history changes to keep multiple hook instances in sync
  useEffect(() => {
    const handler = () => {
      // Best-effort refresh; ignore errors — loadSessions already handles them
      loadSessions();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('chat-history:changed', handler);
      return () => window.removeEventListener('chat-history:changed', handler);
    }
  }, [loadSessions]);

  // Return hook interface
  return {
    sessions,
    activeSession,
    isLoading,
    error,
    createSession,
    loadSession,
    updateCurrentSession,
    updateSession,
    deleteSession,
    clearAllSessions,
    refreshSessions,
  };
}

/**
 * Agent Note: Chat History - Hook for managing a specific session
 * This hook is useful when you need to work with a specific session without
 * affecting the global active session state.
 */
export function useSpecificChatSession(sessionId: string | null) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const sessionData = await chatHistoryService.getSession(id);
      setSession(sessionData);
    } catch (err) {
      console.error('Error loading specific session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    } else {
      setSession(null);
      setError(null);
    }
  }, [sessionId, loadSession]);

  return {
    session,
    isLoading,
    error,
    reload: sessionId ? () => loadSession(sessionId) : () => {},
  };
}

/**
 * Agent Note: Chat History - Hook for session statistics
 * This hook provides aggregate statistics about the user's chat history.
 */
export function useChatHistoryStats() {
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMessages: 0,
    totalCarbonFootprint: 0,
    averageMessagesPerSession: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const sessions = await chatHistoryService.getAllSessions();
      
      const totalSessions = sessions.length;
      const totalMessages = sessions.reduce((sum, session) => sum + session.messageCount, 0);
      const totalCarbonFootprint = sessions.reduce(
        (sum, session) => sum + (session.totalCarbonFootprint || 0), 
        0
      );
      const averageMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0;

      setStats({
        totalSessions,
        totalMessages,
        totalCarbonFootprint,
        averageMessagesPerSession,
      });
    } catch (err) {
      console.error('Error loading chat history stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    isLoading,
    refresh: loadStats,
  };
}
