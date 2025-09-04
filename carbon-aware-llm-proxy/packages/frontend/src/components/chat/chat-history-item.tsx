// Agent Note: Chat History - Individual chat history item component
// This component renders a single chat session in the history sidebar.
// It shows session title, preview, timestamp, and provides interaction controls.

"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  MessageSquare, 
  Trash2, 
  MoreVertical,
  Leaf,
  Clock,
  Hash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatSessionSummary } from "@/types/chat-history";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatCO2 } from "@/lib/utils";

interface ChatHistoryItemProps {
  /** The chat session summary to display */
  session: ChatSessionSummary;
  /** Whether this session is currently active/selected */
  isActive?: boolean;
  /** Callback when the session is clicked to load */
  onSelect: (sessionId: string) => void;
  /** Callback when the session should be deleted */
  onDelete: (sessionId: string) => void;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
}

/**
 * Agent Note: Chat History - Chat history item component
 * This component displays a single chat session in the sidebar with:
 * - Session title and preview text
 * - Timestamp and message count
 * - Carbon footprint if available
 * - Delete action in dropdown menu
 * - Active state styling
 */
export function ChatHistoryItem({
  session,
  isActive = false,
  onSelect,
  onDelete,
  isLoading = false,
}: ChatHistoryItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Agent Note: Chat History - Handle session selection
   * This function handles clicking on a session to load it.
   */
  const handleSelect = () => {
    if (isLoading || isDeleting) return;
    onSelect(session.id);
  };

  /**
   * Agent Note: Chat History - Handle session deletion
   * This function handles the delete action with loading state.
   */
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onSelect
    
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      await onDelete(session.id);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Agent Note: Chat History - Format timestamp for display
   * This function creates a human-readable timestamp.
   */
  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  return (
    <div
      className={cn(
        "group relative glass-hover cursor-pointer transition-all duration-200",
        "border border-transparent rounded-2xl p-3 mb-2",
        isActive && "glass-strong border-primary/30 glass-glow",
        !isActive && "hover:glass-strong hover:border-white/10",
        (isLoading || isDeleting) && "opacity-50 cursor-not-allowed"
      )}
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main content area */}
      <div className="flex items-start gap-3">
        {/* Session icon */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center",
          "glass-panel transition-colors duration-200",
          isActive ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
        )}>
          <MessageSquare className="w-4 h-4" />
        </div>

        {/* Session details */}
        <div className="flex-1 min-w-0">
          {/* Title and actions */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={cn(
              "text-sm font-medium truncate transition-colors duration-200",
              isActive ? "text-primary" : "text-foreground"
            )}>
              {session.title}
            </h4>
            
            {/* Actions dropdown - keep mounted to avoid disappearing on hover edge cases */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-panel">
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Preview text */}
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
            {session.preview}
          </p>

          {/* Metadata row */}
          <div className="flex items-center justify-between gap-2">
            {/* Left side - timestamp and message count */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatTimestamp(session.createdAt)}</span>
              </div>
              
              {session.messageCount > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    <span>{session.messageCount}</span>
                  </div>
                </>
              )}
            </div>

            {/* Right side - carbon footprint badge */}
            {session.totalCarbonFootprint && session.totalCarbonFootprint > 0 && (
              <Badge 
                variant="secondary" 
                className="text-xs px-2 py-0.5 bg-green-100/50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              >
                <Leaf className="w-3 h-3 mr-1" />
                {formatCO2(session.totalCarbonFootprint)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
      )}

      {/* Loading overlay */}
      {(isLoading || isDeleting) && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-2xl flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * Agent Note: Chat History - Empty state component for when there are no sessions
 * This component is displayed when the user has no chat history.
 */
export function ChatHistoryEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="glass-panel p-4 rounded-2xl mb-4">
        <MessageSquare className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-2">
        No chat history yet
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Start a conversation to see your chat history here. Your conversations will be saved locally.
      </p>
    </div>
  );
}

/**
 * Agent Note: Chat History - Loading state component for chat history list
 * This component shows skeleton loading states while chat history is being loaded.
 */
export function ChatHistoryLoadingState() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="glass-panel p-3 rounded-2xl animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-muted/50 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted/50 rounded w-3/4" />
              <div className="h-3 bg-muted/30 rounded w-full" />
              <div className="h-3 bg-muted/30 rounded w-2/3" />
              <div className="flex justify-between items-center">
                <div className="h-3 bg-muted/30 rounded w-1/3" />
                <div className="h-4 bg-muted/30 rounded w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
