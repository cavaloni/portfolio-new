"use client";

import { CheckCircle, Clock, AlertTriangle, Zap, Leaf, DollarSign, Star, Server } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ChatProgress } from "@/services/chat-service";
import { useState } from "react";

interface ChatProgressIndicatorProps {
  progress: ChatProgress | null;
}

export function ChatProgressIndicator({ progress }: ChatProgressIndicatorProps) {
  if (!progress) return null;

  const [isHovering, setIsHovering] = useState(false);

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'routing':
        return <Clock className="h-3 w-3 animate-pulse opacity-60" />;
      case 'deploying':
        return <Clock className="h-3 w-3 animate-spin opacity-60" />;
      case 'fallback':
        return <Zap className="h-3 w-3 text-orange-500 opacity-60" />;
      case 'ready':
        return null; // Remove green checkmark
      case 'error':
        return <AlertTriangle className="h-3 w-3 text-red-500 opacity-60" />;
      default:
        return <Clock className="h-3 w-3 opacity-60" />;
    }
  };

  const getModelIcon = (modelId?: string) => {
    if (!modelId) return null;

    // Determine model type/preference from model name
    if (modelId.includes('llama') || modelId.includes('Llama')) {
      return <DollarSign className="h-2.5 w-2.5" />;
    }
    if (modelId.includes('mistral') || modelId.includes('Mistral')) {
      return <Zap className="h-2.5 w-2.5" />;
    }
    if (modelId.includes('qwen') || modelId.includes('Qwen')) {
      return <Star className="h-2.5 w-2.5" />;
    }
    return <Leaf className="h-2.5 w-2.5" />;
  };

  const getDataCenterAnimation = () => {
    if (progress.status === 'ready') return null;

    return (
      <div
        className="relative group cursor-pointer"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="relative flex items-center justify-center w-4 h-4">
          {/* Animated data center icon */}
          <Server className="h-3 w-3 text-muted-foreground/50 animate-pulse absolute" />
          {/* Subtle rotating ring */}
          <div className="w-4 h-4 rounded-full border border-primary/20 animate-spin"
               style={{ animationDuration: '3s' }} />
        </div>

        {/* Hover tooltip */}
        {isHovering && (progress.message || (progress.estimatedWait && progress.estimatedWait > 5000) || progress.usedFallback) && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg border z-50 max-w-xs">
            {progress.message && <div className="font-medium mb-1">{progress.message}</div>}
            {progress.estimatedWait && progress.estimatedWait > 5000 && (
              <div className="text-muted-foreground">
                Estimated wait: ~{Math.round(progress.estimatedWait / 1000)}s
              </div>
            )}
            {progress.usedFallback && (
              <div className="text-muted-foreground">
                Switched to fallback option for faster response
              </div>
            )}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover" />
          </div>
        )}
      </div>
    );
  };

  const getVariant = () => {
    switch (progress.status) {
      case 'error':
        return 'destructive' as const;
      case 'fallback':
        return 'default' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <Alert
      variant={getVariant()}
      className="mt-[-6px] mx-4 md:mx-8 rounded-t-none rounded-b-lg border border-transparent border-l-2 border-l-primary/20 bg-transparent/50 backdrop-blur-sm text-muted-foreground p-1.5 pl-2 shadow-none relative -top-2"
    >
      {getStatusIcon()}
      <AlertDescription className="flex items-center justify-between gap-2 text-[10px] opacity-70">
        <div className="flex-1">
          {/* Data center animation instead of message text */}
          {getDataCenterAnimation()}
        </div>

        {progress.deployment && (
          <div className="flex items-center gap-1 ml-1 whitespace-nowrap">
            <Badge variant="outline" className="flex items-center gap-1 text-[9px] py-0 px-1.5 h-4 border-muted-foreground/30 opacity-80">
              {getModelIcon(progress.deployment.modelId)}
              {progress.deployment.modelId}
            </Badge>
            {progress.deployment.region && (
              <Badge variant="secondary" className="text-[9px] py-0 px-1.5 h-4 bg-muted/50 opacity-80">
                {progress.deployment.region}
              </Badge>
            )}
            {progress.carbonFootprint !== undefined ? (
              <Badge
                variant="outline"
                className="flex items-center gap-1 text-[9px] py-0 px-1.5 h-4 border-emerald-500/30 opacity-80"
                title="Actual carbon emissions for this request"
              >
                <Leaf className="h-2 w-2" />
                {progress.carbonFootprint < 1
                  ? `${(progress.carbonFootprint * 1000).toFixed(1)}mg`
                  : `${progress.carbonFootprint.toFixed(2)}g`
                } CO₂e
              </Badge>
            ) : progress.deployment.co2_g_per_kwh > 0 && (
              <Badge
                variant="outline"
                className="text-[9px] py-0 px-1.5 h-4 border-muted-foreground/30 opacity-80"
                title="Carbon intensity for this region"
              >
                {Math.round(progress.deployment.co2_g_per_kwh)}g/kWh
              </Badge>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}






