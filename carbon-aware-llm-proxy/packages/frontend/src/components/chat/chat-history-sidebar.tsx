// Agent Note: Chat History - Main chat history sidebar component
// This component provides the complete chat history sidebar section that integrates
// into the existing chat page sidebar. It replaces the "Preference Guide" section.

"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { useChatHistory } from "@/hooks/use-chat-history";
import { cn } from "@/lib/utils";
import { Message } from "@/types/chat";
import { useCallback, useState } from "react";
import { ChatHistoryHeader } from "./chat-history-header";
import { ChatHistoryItem, ChatHistoryLoadingState } from "./chat-history-item";

interface ChatHistorySidebarProps {
  /** Whether the chat history section is expanded */
  isExpanded: boolean;
  /** Callback to toggle the expanded state */
  onToggleExpanded: () => void;
  /** Callback to maximize this section (collapse all others) */
  onMaximize: () => void;
  /** Callback when a session is loaded */
  onSessionLoad: (messages: Message[]) => void;
  /** Callback when a new chat is started */
  onNewChat: () => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Agent Note: Chat History - Main chat history sidebar component
 * This component manages the complete chat history functionality including:
 * - Loading and displaying chat sessions
 * - Creating new sessions from current chat
 * - Loading existing sessions
 * - Deleting sessions
 * - Export/import functionality
 * - Error handling and loading states
 */
export function ChatHistorySidebar({
  isExpanded,
  onToggleExpanded,
  onMaximize,
  onSessionLoad,
  onNewChat,
  className,
}: ChatHistorySidebarProps) {
  const {
    sessions,
    activeSession,
    isLoading,
    error,
    loadSession,
    deleteSession,
    clearAllSessions,
    refreshSessions,
  } = useChatHistory();

  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [confirmClearAllOpen, setConfirmClearAllOpen] = useState(false);

  /**
   * Agent Note: Chat History - Handle creating a new chat session
   * Previously this saved the current chat before starting a new one, but that
   * caused duplicate sessions because the main chat page also auto-saves.
   * Now we delegate saving to the parent via onNewChat to avoid duplicates.
   */
  const handleNewChat = useCallback(async () => {
    try {
      setOperationLoading("new-chat");
      // Start a new chat (parent will handle saving the current chat if desired)
      onNewChat();
    } catch (error) {
      console.error("Error creating new chat:", error);
      toast.error("Failed to start new chat");
    } finally {
      setOperationLoading(null);
    }
  }, [onNewChat]);

  /**
   * Agent Note: Chat History - Handle loading a chat session
   * This function loads a session and updates the current chat.
   */
  const handleSessionSelect = useCallback(
    async (sessionId: string) => {
      try {
        setOperationLoading(sessionId);

        const session = await loadSession(sessionId);
        if (session) {
          onSessionLoad(session.messages);
          toast.success(`Loaded chat: ${session.title}`);
        }
      } catch (error) {
        console.error("Error loading session:", error);
        toast.error("Failed to load chat session");
      } finally {
        setOperationLoading(null);
      }
    },
    [loadSession, onSessionLoad]
  );

  /**
   * Agent Note: Chat History - Handle deleting a chat session
   * This function deletes a session with confirmation.
   */
  const handleSessionDelete = useCallback(
    async (sessionId: string) => {
      // Use a confirm dialog instead of window.confirm; short-circuit to open dialog
      const sess = sessions.find((s) => s.id === sessionId);
      if (sess) {
        setConfirmDelete({ id: sessionId, title: sess.title });
        return;
      }
      try {
        const session = sessions.find((s) => s.id === sessionId);
        if (!session) return;

        // In a real app, you might want to show a confirmation dialog
        const confirmed = window.confirm(`Delete chat "${session.title}"?`);
        if (!confirmed) return;

        setOperationLoading(`delete-${sessionId}`);

        const success = await deleteSession(sessionId);
        if (success) {
          toast.success("Chat deleted");
        } else {
          toast.error("Failed to delete chat");
        }
      } catch (error) {
        console.error("Error deleting session:", error);
        toast.error("Failed to delete chat");
      } finally {
        setOperationLoading(null);
      }
    },
    [sessions, deleteSession]
  );

  /**
   * Agent Note: Chat History - Handle clearing all chat history
   * This function clears all sessions with confirmation.
   */
  const handleClearAll = useCallback(async () => {
    // Open confirm dialog instead of window.confirm
    setConfirmClearAllOpen(true);
    return;
    try {
      const confirmed = window.confirm(
        "Are you sure you want to delete all chat history? This action cannot be undone."
      );
      if (!confirmed) return;

      setOperationLoading("clear-all");

      await clearAllSessions();
      toast.success("All chat history cleared");
    } catch (error) {
      console.error("Error clearing all sessions:", error);
      toast.error("Failed to clear chat history");
    } finally {
      setOperationLoading(null);
    }
  }, [clearAllSessions]);

  /**
   * Agent Note: Chat History - Handle exporting chat history
   * This function exports all chat history as a JSON file.
   */
  const handleExport = useCallback(async () => {
    try {
      setOperationLoading("export");

      // In a real implementation, you'd get the export data from the service
      const exportData = {
        sessions: sessions,
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-history-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Chat history exported");
    } catch (error) {
      console.error("Error exporting chat history:", error);
      toast.error("Failed to export chat history");
    } finally {
      setOperationLoading(null);
    }
  }, [sessions]);

  /**
   * Agent Note: Chat History - Handle importing chat history
   * This function handles importing chat history from a JSON file.
   */
  const handleImport = useCallback(async () => {
    try {
      setOperationLoading("import");

      // The actual file handling is done in the header component
      // This is just a placeholder for the import logic
      await refreshSessions();
      toast.success("Chat history imported");
    } catch (error) {
      console.error("Error importing chat history:", error);
      toast.error("Failed to import chat history");
    } finally {
      setOperationLoading(null);
    }
  }, [refreshSessions]);

  return (
    <div
      className={cn(
        "flex flex-col h-full backdrop-blur-sm border-r border-border/50 overflow-hidden",
        className
      )}
    >
      <ChatHistoryHeader
        isExpanded={isExpanded}
        onToggleExpanded={onToggleExpanded}
        onMaximize={onMaximize}
        onNewChat={handleNewChat}
        onExport={handleExport}
        onImport={handleImport}
        onClearAll={() => setConfirmClearAllOpen(true)}
        sessionCount={sessions.length}
        className="border-b border-border/50 flex-shrink-0"
      />

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out flex flex-col",
          isExpanded ? "flex-1" : "h-0"
        )}
      >
        {isLoading ? (
          <ChatHistoryLoadingState />
        ) : error ? (
          <div className="p-4 text-destructive text-sm">
            Error loading chat history. Please try refreshing the page.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden styled-scrollbar">
            {sessions.length > 0 ? (
              <div className="space-y-1">
                {sessions.map((session) => (
                  <ChatHistoryItem
                    key={session.id}
                    session={session}
                    isActive={activeSession?.id === session.id}
                    onSelect={handleSessionSelect}
                    onDelete={handleSessionDelete}
                    isLoading={operationLoading === session.id}
                  />
                ))}
              </div>
            ) : (
              <div className="p-4 text-muted-foreground text-sm text-center">
                No chat history yet. Start a new chat!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete chat?"
        description={
          confirmDelete ? (
            <span>
              Are you sure you want to delete "{confirmDelete.title}"? This
              action cannot be undone.
            </span>
          ) : undefined
        }
        confirmLabel="Delete"
        destructive
        isLoading={
          !!(confirmDelete && operationLoading === `delete-${confirmDelete.id}`)
        }
        onConfirm={async () => {
          if (!confirmDelete) return;
          const id = confirmDelete.id;
          try {
            setOperationLoading(`delete-${id}`);
            const success = await deleteSession(id);
            if (success) {
              toast.success("Chat deleted");
            } else {
              toast.error("Failed to delete chat");
            }
          } catch (e) {
            console.error("Error deleting session:", e);
            toast.error("Failed to delete chat");
          } finally {
            setOperationLoading(null);
            setConfirmDelete(null);
          }
        }}
      />

      {/* Confirm clear all dialog */}
      <ConfirmDialog
        open={confirmClearAllOpen}
        onOpenChange={setConfirmClearAllOpen}
        title="Clear all chat history?"
        description="This will permanently delete all saved chats. This action cannot be undone."
        confirmLabel="Delete All"
        destructive
        isLoading={operationLoading === "clear-all"}
        onConfirm={async () => {
          try {
            setOperationLoading("clear-all");
            await clearAllSessions();
            toast.success("All chat history cleared");
            setConfirmClearAllOpen(false);
          } catch (e) {
            console.error("Error clearing all sessions:", e);
            toast.error("Failed to clear chat history");
          } finally {
            setOperationLoading(null);
          }
        }}
      />
    </div>
  );
}
