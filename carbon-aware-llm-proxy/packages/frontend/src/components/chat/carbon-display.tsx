"use client";

import { Badge } from "@/components/ui/badge";
import { Leaf, Zap } from "lucide-react";

interface CarbonDisplayProps {
  carbonFootprint?: number;
  energyUsage?: number;
  tokenCount?: number;
  className?: string;
}

export function CarbonDisplay({
  carbonFootprint,
  energyUsage,
  tokenCount,
  className = ""
}: CarbonDisplayProps) {
  if (!carbonFootprint && !energyUsage) return null;

  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      {carbonFootprint !== undefined && (
        <Badge variant="outline" className="flex items-center gap-1 text-[9px] py-0 px-1.5 h-4 border-muted-foreground/30">
          <Leaf className="h-2 w-2" />
          {carbonFootprint < 0.01
            ? `${(carbonFootprint * 1000).toFixed(1)}mg CO₂`
            : `${carbonFootprint.toFixed(2)}g CO₂`
          }
        </Badge>
      )}
      {energyUsage !== undefined && (
        <Badge variant="outline" className="flex items-center gap-1 text-[9px] py-0 px-1.5 h-4 border-muted-foreground/30">
          <Zap className="h-2 w-2" />
          {energyUsage < 0.001
            ? `${(energyUsage * 1000).toFixed(2)}Wh`
            : `${energyUsage.toFixed(3)}kWh`
          }
        </Badge>
      )}
      {tokenCount !== undefined && (
        <Badge variant="secondary" className="text-[9px] py-0 px-1.5 h-4 bg-muted/50">
          {tokenCount} tokens
        </Badge>
      )}
    </div>
  );
}