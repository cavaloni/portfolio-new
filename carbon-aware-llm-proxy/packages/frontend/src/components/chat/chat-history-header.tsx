// Agent Note: Chat History - Header component for chat history sidebar section
// This component provides the collapsible header with expand/collapse controls
// and action buttons for the chat history section.

"use client";

import { 
  ChevronDown, 
  ChevronRight, 
  Maximize2, 
  Plus, 
  Trash2,
  Download,
  Upload,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ChatHistoryHeaderProps {
  /** Whether the chat history section is expanded */
  isExpanded: boolean;
  /** Callback to toggle the expanded state */
  onToggleExpanded: () => void;
  /** Callback to maximize the chat history section (collapse all others) */
  onMaximize: () => void;
  /** Callback to create a new chat session */
  onNewChat: () => void;
  /** Callback to clear all chat history */
  onClearAll: () => void;
  /** Callback to export chat history */
  onExport: () => void;
  /** Callback to import chat history */
  onImport: () => void;
  /** Number of total sessions for display */
  sessionCount: number;
  /** Whether any operations are in progress */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Agent Note: Chat History - Chat history section header
 * This component provides the header for the chat history sidebar section with:
 * - Collapsible expand/collapse functionality
 * - Session count display
 * - Maximize button to focus on chat history
 * - Action menu with new chat, clear all, export/import options
 */
export function ChatHistoryHeader({
  isExpanded,
  onToggleExpanded,
  onMaximize,
  onNewChat,
  onClearAll,
  onExport,
  onImport,
  sessionCount,
  isLoading = false,
}: ChatHistoryHeaderProps) {
  
  /**
   * Agent Note: Chat History - Handle file import
   * This function handles the file input for importing chat history.
   */
  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            onImport();
            // In a real implementation, you'd pass the data to the import function
            console.log('Import data:', data);
          } catch (error) {
            console.error('Error parsing import file:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="flex items-center justify-between w-full p-4 text-sm font-medium">
      {/* Left side - expand/collapse button and title */}
      <button
        onClick={onToggleExpanded}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-2 text-left hover:bg-white/5 transition-colors rounded-lg p-1 -ml-1",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span>Chat History</span>
        {sessionCount > 0 && (
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {sessionCount}
          </span>
        )}
      </button>

      {/* Right side - action buttons */}
      <div className="flex items-center gap-1">
        {/* Maximize button - expands chat history and collapses others */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMaximize}
          disabled={isLoading}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
          title="Focus on chat history"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        {/* New chat button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewChat}
          disabled={isLoading}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
          title="Start new chat"
        >
          <Plus className="h-4 w-4" />
        </Button>

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isLoading}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-panel">
            <DropdownMenuItem onClick={onNewChat} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={onExport} disabled={isLoading || sessionCount === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export History
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={handleImportClick} disabled={isLoading}>
              <Upload className="h-4 w-4 mr-2" />
              Import History
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={onClearAll} 
              disabled={isLoading || sessionCount === 0}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All History
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/**
 * Agent Note: Chat History - Compact header variant for mobile/small screens
 * This component provides a more compact version of the header for smaller screens.
 */
export function ChatHistoryHeaderCompact({
  isExpanded,
  onToggleExpanded,
  sessionCount,
  isLoading = false,
}: Pick<ChatHistoryHeaderProps, 'isExpanded' | 'onToggleExpanded' | 'sessionCount' | 'isLoading'>) {
  return (
    <button
      onClick={onToggleExpanded}
      disabled={isLoading}
      className={cn(
        "flex items-center justify-between w-full p-3 text-sm font-medium text-left",
        "hover:bg-white/5 transition-colors",
        isLoading && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-2">
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span>Chat History</span>
      </div>
      
      {sessionCount > 0 && (
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
          {sessionCount}
        </span>
      )}
    </button>
  );
}
