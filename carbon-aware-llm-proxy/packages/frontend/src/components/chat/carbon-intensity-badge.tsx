"use client";

import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Info } from "lucide-react";

interface CarbonIntensityBadgeProps {
  intensity: number;
  className?: string;
}

export function CarbonIntensityBadge({ intensity, className = "" }: CarbonIntensityBadgeProps) {
  // Determine color based on intensity thresholds
  const getColorClass = (intensity: number) => {
    if (intensity <= 200) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300";
    } else if (intensity <= 400) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300";
    } else {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300";
    }
  };

  const getDotColor = (intensity: number) => {
    if (intensity <= 200) {
      return "bg-green-500";
    } else if (intensity <= 400) {
      return "bg-yellow-500";
    } else {
      return "bg-red-500";
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={`flex items-center gap-1 text-[9px] py-0 px-1.5 h-4 ${getColorClass(intensity)} ${className}`}
        >
          <div className={`w-1 h-1 rounded-full ${getDotColor(intensity)}`} />
          {intensity} gCO₂/kWh
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <Info className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">Grid Carbon Intensity</span>
        </div>
        <p className="text-muted-foreground">
          Carbon intensity for this region ({intensity} gCO₂ per kWh).
          Lower values indicate cleaner energy sources.
        </p>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">≤ 200: Clean grid</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">201-400: Mixed grid</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">> 400: Carbon-heavy</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}