"use client";

import { Icons } from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageAnalyticsFooter } from "./message-analytics-footer";
import type { Message as ChatMessage } from "@/types/chat";
import { MessageRole } from "@/types/chat";
import type { Message as ServiceMessage } from "@/services/chat-service";
import { formatDistanceToNow } from "date-fns";
import { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

// Component for streaming text with fade-in animation for new content only
const StreamingText = ({ content, isStreaming }: { content: string; isStreaming: boolean }) => {
  const [previousContent, setPreviousContent] = useState('');
  const [displayContent, setDisplayContent] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isStreaming && content && content !== previousContent) {
      // Find the new characters that were added
      const newChars = content.slice(previousContent.length);
      
      if (newChars) {
        // Start animation
        setIsAnimating(true);
        setDisplayContent(content);
        setPreviousContent(content);
        
        // Clear animation after it completes
        const timer = setTimeout(() => {
          setIsAnimating(false);
        }, 500);

        return () => clearTimeout(timer);
      } else {
        setDisplayContent(content);
        setPreviousContent(content);
      }
    } else if (!isStreaming) {
      setDisplayContent(content);
      setPreviousContent(content);
      setIsAnimating(false);
    }
  }, [content, previousContent, isStreaming]);

  return (
    <div className={`streaming-text-container ${isAnimating ? 'streaming-text-active' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            />
          ),
          code: ({ node, className, children, ...props }) => {
            const isInline = !className?.includes('language-');
            if (isInline) {
              return (
                <code className="bg-gray-800 rounded px-1.5 py-0.5 text-sm">
                  {children}
                </code>
              );
            }
            return (
              <div className="bg-gray-800 rounded-md p-4 my-2 overflow-x-auto">
                <code className={className} {...props}>
                  {children}
                </code>
              </div>
            );
          },
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-6 my-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-6 my-2" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-gray-600 pl-4 my-2 text-gray-300 italic"
              {...props}
            />
          ),
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl font-bold my-3" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl font-bold my-3" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-lg font-semibold my-2" {...props} />
          ),
          p: ({ node, ...props }) => <p className="my-2" {...props} />,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table
                className="min-w-full border border-gray-700"
                {...props}
              />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th
              className="border border-gray-600 px-4 py-2 text-left bg-gray-800"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-gray-600 px-4 py-2" {...props} />
          ),
        }}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  );
};

export interface ChatMessageProps {
  message: ChatMessage | ServiceMessage;
  isCurrentUser: boolean;
  onRegenerate?: () => void;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
  className?: string;
}

export function ChatMessage({
  message,
  isCurrentUser,
  onRegenerate,
  onEdit,
  onDelete,
  className,
}: ChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleEdit = () => {
    if (isEditing) {
      onEdit?.(editedContent);
      setIsEditing(false);
    } else {
      setIsEditing(true);
      // Focus the textarea after it's rendered
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(
          editedContent.length,
          editedContent.length
        );
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditedContent(message.content);
    }
  };

  const getAvatar = () => {
    if (isCurrentUser) {
      return (
        <Avatar className="h-10 w-10 glass-glow">
          <AvatarFallback className="glass text-primary font-semibold">
            You
          </AvatarFallback>
        </Avatar>
      );
    }

    return (
      <Avatar className="h-10 w-10 bg-primary/10 text-primary glass-glow">
        <AvatarFallback className="glass-strong text-primary font-semibold">
          {message.role === MessageRole.Assistant ? "AI" : "Sys"}
        </AvatarFallback>
      </Avatar>
    );
  };

  const getMessageContent = () => {
    if (isEditing) {
      return (
        <div className="w-full">
          <textarea
            ref={textareaRef}
            className="w-full min-h-[100px] p-2 rounded-md border border-input bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (editedContent !== message.content) {
                handleEdit();
              } else {
                setIsEditing(false);
              }
            }}
          />
          <div className="mt-2 flex justify-end space-x-2 text-xs text-muted-foreground">
            <span>Press Enter to save, Esc to cancel</span>
          </div>
        </div>
      );
    }

    return (
      <div className="prose prose-invert max-w-none break-words">
        {message.isStreaming && !message.content ? (
          <div className="flex items-center space-x-1">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse delay-100" />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse delay-200" />
          </div>
        ) : message.content ? (
          <StreamingText
            content={message.content}
            isStreaming={message.isStreaming || false}
          />
        ) : null}
      </div>
    );
  };

  const getMessageActions = () => {
    if (isEditing) return null;

    return (
      <div className="absolute -top-2 right-3 flex space-x-1 glass-strong rounded-2xl p-2 shadow-lg">
        {!isCurrentUser && onRegenerate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-xl"
            onClick={onRegenerate}
            title="Regenerate response"
          >
            <Icons.refreshCw className="h-3 w-3" />
          </Button>
        )}
        {isCurrentUser && onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-xl"
            onClick={handleEdit}
            title="Edit message"
          >
            <Icons.edit className="h-3 w-3" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-xl text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete message"
          >
            <Icons.trash className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  // Only show analytics footer for assistant messages
  const shouldShowAnalytics = !isCurrentUser && (
    ('carbonFootprint' in message && message.carbonFootprint) ||
    ('model' in message && message.model) ||
    ('tokens' in message && message.tokens)
  );

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 py-4 px-4 mx-3 my-3 max-w-full overflow-x-hidden",
        isCurrentUser
          ? "glass glass-glow sm:ml-8"
          : "glass-panel sm:mr-8",
        className
      )}
    >
      <div className="flex-shrink-0">{getAvatar()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">
            {isCurrentUser
              ? "You"
              : message.role === MessageRole.Assistant
                ? "AI Assistant"
                : "System"}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.timestamp ? formatDistanceToNow(new Date(message.timestamp), {
              addSuffix: true,
            }) : 'Just now'}
          </span>
        </div>
        <div className="mt-1">
          {getMessageContent()}
          {shouldShowAnalytics && <MessageAnalyticsFooter message={message} />}
        </div>
      </div>
      {getMessageActions()}
    </div>
  );
}