"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { Message, MessageRole } from "@/types/chat";
import { formatDistanceToNow } from "date-fns";
import { useRef, useState } from "react";

export interface ChatMessageProps {
  message: Message;
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
  const [isHovered, setIsHovered] = useState(false);
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
          editedContent.length,
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
        <Avatar className="h-8 w-8">
          <AvatarFallback>You</AvatarFallback>
        </Avatar>
      );
    }

    return (
      <Avatar className="h-8 w-8 bg-primary/10 text-primary">
        <AvatarFallback>
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
      <div className="whitespace-pre-wrap break-words">
        {message.isStreaming && !message.content ? (
          <div className="flex items-center space-x-1">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse delay-100" />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse delay-200" />
          </div>
        ) : (
          message.content
        )}
      </div>
    );
  };

  const getCarbonInfo = () => {
    if (!message.carbonFootprint) return null;

    const { emissions, energy, intensity } = message.carbonFootprint;
    const emissionsText =
      emissions < 1
        ? `${(emissions * 1000).toFixed(2)} mg CO₂e`
        : `${emissions.toFixed(2)} g CO₂e`;

    return (
      <div className="mt-2 text-xs text-muted-foreground flex items-center space-x-2">
        <span title="Carbon emissions">
          <Icons.droplet className="inline h-3 w-3 mr-1 text-emerald-500" />
          {emissionsText}
        </span>
        <span className="text-muted-foreground/50">•</span>
        <span title="Energy consumption">
          <Icons.zap className="inline h-3 w-3 mr-1 text-amber-500" />
          {energy.toFixed(6)} kWh
        </span>
        {intensity && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <span title="Carbon intensity">
              <Icons.activity className="inline h-3 w-3 mr-1 text-rose-500" />
              {intensity.toFixed(0)} g/kWh
            </span>
          </>
        )}
      </div>
    );
  };

  const getMessageActions = () => {
    if (!isHovered || isEditing) return null;

    return (
      <div className="absolute -top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-sm border">
        {!isCurrentUser && onRegenerate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
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
            className="h-6 w-6"
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
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete message"
          >
            <Icons.trash className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-4 py-4 px-4",
        isCurrentUser ? "bg-muted/50" : "bg-background",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
            {formatDistanceToNow(new Date(message.timestamp), {
              addSuffix: true,
            })}
            {message.model && ` • ${message.model}`}
          </span>
        </div>
        <div className="mt-1">
          {getMessageContent()}
          {getCarbonInfo()}
        </div>
      </div>
      {getMessageActions()}
    </div>
  );
}
