"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Globe, Zap, Leaf, DollarSign, Star, Lightbulb, Brain, Rocket } from "lucide-react";

interface PromptSuggestionsProps {
  onPromptSelect: (prompt: string) => void;
  className?: string;
}

const promptSuggestions = [
  {
    text: "What's the carbon footprint of AI models?",
    icon: Leaf,
    color: "text-green-400",
  },
  {
    text: "How can I optimize my AI deployment for speed?",
    icon: Zap,
    color: "text-blue-400",
  },
  {
    text: "Which region has the lowest AI inference costs?",
    icon: DollarSign,
    color: "text-orange-400",
  },
  {
    text: "What's the best model for my use case?",
    icon: Star,
    color: "text-purple-400",
  },
  {
    text: "How does geographic location affect AI performance?",
    icon: Globe,
    color: "text-cyan-400",
  },
  {
    text: "Can you explain carbon-aware routing?",
    icon: Brain,
    color: "text-indigo-400",
  },
  {
    text: "What are the trade-offs between speed and sustainability?",
    icon: Rocket,
    color: "text-pink-400",
  },
  {
    text: "How do I balance cost and quality in AI deployment?",
    icon: Lightbulb,
    color: "text-yellow-400",
  },
];

export function PromptSuggestions({ onPromptSelect, className }: PromptSuggestionsProps) {
  return (
    <div className={cn("mt-6 space-y-3", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
        {promptSuggestions.map((prompt, index) => {
          const IconComponent = prompt.icon;
          return (
            <Button
              key={index}
              variant="ghost"
              className="h-auto p-3 text-left justify-start gap-3 glass-hover rounded-xl border border-border/50 hover:border-border transition-all duration-200"
              onClick={() => onPromptSelect(prompt.text)}
            >
              <IconComponent className={cn("h-4 w-4 flex-shrink-0", prompt.color)} />
              <span className="text-sm text-muted-foreground leading-relaxed">
                {prompt.text}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
