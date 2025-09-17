"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Info } from "lucide-react";
import type { Message as ChatMessage } from "@/types/chat";
import type { Message as ServiceMessage } from "@/services/chat-service";

interface MessageAnalyticsFooterProps {
  message: ChatMessage | ServiceMessage;
  className?: string;
}

export function MessageAnalyticsFooter({ message, className = "" }: MessageAnalyticsFooterProps) {
  // Handle both ChatMessage and ServiceMessage types
  const isChatMessage = 'carbonFootprint' in message && typeof message.carbonFootprint === 'object';
  const isServiceMessage = 'carbonFootprint' in message && typeof message.carbonFootprint === 'number';

  let emissions = 0;
  let energy = 0;
  let tokens = 0;
  let modelName = "";

  if (isChatMessage && message.carbonFootprint) {
    // ChatMessage type with structured carbon footprint
    const footprint = message.carbonFootprint as { emissions: number; energy: number; };
    emissions = footprint.emissions;
    energy = footprint.energy;
    tokens = (message as ChatMessage).tokens || 0;
    modelName = (message as ChatMessage).model || "";
  } else if (isServiceMessage) {
    // ServiceMessage type with flat carbon footprint
    emissions = (message as ServiceMessage).carbonFootprint || 0;
    energy = (message as ServiceMessage).energyUsage || 0;
    tokens = (message as ServiceMessage).tokenCount || 0;
    modelName = (message as ServiceMessage).model || "";
  }

  if (emissions === 0 && energy === 0 && !modelName) return null;

  const emissionsText =
    emissions < 1
      ? `${(emissions * 1000).toFixed(2)} mg CO₂e`
      : `${emissions.toFixed(3)} g CO₂e`;

  const energyText = `${energy.toFixed(6)} kWh`;

  return (
    <div className={`mt-2 pt-2 border-t border-border/30 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/80 ${className}`}>
      {/* CO₂ Emissions */}
      <div className="flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 hover:text-foreground transition-colors rounded-sm">
              <span className="font-medium text-emerald-500/70 dark:text-emerald-400/70">
                {emissionsText}
              </span>
              <Info className="h-3 w-3 opacity-60 hover:opacity-100 transition-opacity" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 text-xs" side="top">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">Carbon Emissions</span>
            </div>
            <p className="text-muted-foreground">
              The total carbon dioxide equivalent emissions produced by this message.
              Lower values indicate better environmental performance.
            </p>
          </PopoverContent>
        </Popover>
      </div>

      <span className="text-border/40">|</span>

      {/* Energy Usage */}
      <div className="flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 hover:text-foreground transition-colors rounded-sm">
              <span className="font-medium text-amber-500/70 dark:text-amber-400/70">
                {energyText}
              </span>
              <Info className="h-3 w-3 opacity-60 hover:opacity-100 transition-opacity" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 text-xs" side="top">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">Energy Consumption</span>
            </div>
            <p className="text-muted-foreground">
              The total energy consumed to generate this response, measured in kilowatt-hours (kWh).
            </p>
          </PopoverContent>
        </Popover>
      </div>

      {tokens > 0 && (
        <>
          <span className="text-border/40">|</span>
          {/* Token Count */}
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 hover:text-foreground transition-colors rounded-sm">
                  <span className="font-medium text-muted-foreground">
                    {tokens.toLocaleString()} tokens
                  </span>
                  <Info className="h-3 w-3 opacity-60 hover:opacity-100 transition-opacity" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 text-xs" side="top">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Token Count</span>
                </div>
                <p className="text-muted-foreground">
                  The number of AI model tokens (roughly words or word pieces) processed
                  for this response. Higher counts generally indicate more complex responses.
                </p>
              </PopoverContent>
            </Popover>
          </div>
        </>
      )}

      {modelName && (
        <>
          <span className="text-border/40">|</span>
          {/* Model Name */}
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 hover:text-foreground transition-colors rounded-sm">
                  <span className="font-medium text-blue-500/60 dark:text-blue-400/60">
                    Model: {modelName}
                  </span>
                  <Info className="h-3 w-3 opacity-60 hover:opacity-100 transition-opacity" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 text-xs" side="top">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">AI Model</span>
                </div>
                <p className="text-muted-foreground">
                  The specific AI model used to generate this response.
                  Different models have varying capabilities, speeds, and environmental impacts.
                </p>
              </PopoverContent>
            </Popover>
          </div>
        </>
      )}
    </div>
  );
}