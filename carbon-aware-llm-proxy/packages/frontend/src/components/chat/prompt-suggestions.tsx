"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Globe, Zap, Leaf, DollarSign, Star, Lightbulb, Brain, Rocket, Cpu, Cloud, Target, TrendingUp, Shield, Users, Database, Clock } from "lucide-react";

interface PromptSuggestionsProps {
  onPromptSelect: (prompt: string) => void;
  className?: string;
}

const allPromptSuggestions = [
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
  {
    text: "What's the difference between CPU and GPU inference?",
    icon: Cpu,
    color: "text-red-400",
  },
  {
    text: "How do cloud providers compare for AI workloads?",
    icon: Cloud,
    color: "text-slate-400",
  },
  {
    text: "What are the latency requirements for real-time AI?",
    icon: Target,
    color: "text-emerald-400",
  },
  {
    text: "How can I monitor AI model performance over time?",
    icon: TrendingUp,
    color: "text-teal-400",
  },
  {
    text: "What security considerations are there for AI deployments?",
    icon: Shield,
    color: "text-gray-400",
  },
  {
    text: "How does user load affect AI model selection?",
    icon: Users,
    color: "text-violet-400",
  },
  {
    text: "What's the best way to store AI model artifacts?",
    icon: Database,
    color: "text-amber-400",
  },
  {
    text: "How do I handle AI model versioning and updates?",
    icon: Clock,
    color: "text-lime-400",
  },
];

export function PromptSuggestions({ onPromptSelect, className }: PromptSuggestionsProps) {
  const [displaySuggestions, setDisplaySuggestions] = useState(allPromptSuggestions.slice(0, 4));

  // Randomly select 4 suggestions on component mount
  useEffect(() => {
    const shuffled = [...allPromptSuggestions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 4);
    setDisplaySuggestions(selected);
  }, []);

  return (
    <div className={cn("mt-6 space-y-3", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
        {displaySuggestions.map((prompt, index) => {
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
