"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  disabled,
  placeholder = "Type your message...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;

    onSendMessage(message.trim());
    setMessage("");
    
    // Focus will be handled by the effect when disabled state changes
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-focus on mount and when disabled state changes
  useEffect(() => {
    if (!disabled) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [disabled]);

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setMessage(e.target.value)
        }
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 min-h-[48px] max-h-[120px] resize-none glass-input px-4 py-3 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
        rows={1}
      />
      <Button 
        type="submit" 
        disabled={disabled || !message.trim()} 
        size="icon"
        variant="glass"
        className="h-12 w-12 rounded-2xl text-foreground disabled:opacity-80"
        aria-label="Send message"
      >
        <Send className="h-5 w-5 text-foreground/95 drop-shadow" strokeWidth={2.2} />
      </Button>
    </form>
  );
}
