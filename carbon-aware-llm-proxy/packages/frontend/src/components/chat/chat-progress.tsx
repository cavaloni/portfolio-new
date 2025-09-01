"use client";

import { CheckCircle, Clock, AlertTriangle, Zap, Leaf, DollarSign, Star } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ChatProgress } from "@/services/chat-service";

interface ChatProgressIndicatorProps {
  progress: ChatProgress | null;
}

export function ChatProgressIndicator({ progress }: ChatProgressIndicatorProps) {
  if (!progress) return null;

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'routing':
        return <Clock className="h-4 w-4 animate-pulse" />;
      case 'deploying':
        return <Clock className="h-4 w-4 animate-spin" />;
      case 'fallback':
        return <Zap className="h-4 w-4 text-orange-500" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getModelIcon = (modelId?: string) => {
    if (!modelId) return null;
    
    // Determine model type/preference from model name
    if (modelId.includes('llama') || modelId.includes('Llama')) {
      return <DollarSign className="h-3 w-3" />;
    }
    if (modelId.includes('mistral') || modelId.includes('Mistral')) {
      return <Zap className="h-3 w-3" />;
    }
    if (modelId.includes('qwen') || modelId.includes('Qwen')) {
      return <Star className="h-3 w-3" />;
    }
    return <Leaf className="h-3 w-3" />;
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
      className="mt-[-6px] mx-4 md:mx-8 rounded-t-none rounded-b-xl border border-transparent border-l-2 border-l-primary/30 bg-transparent text-muted-foreground p-2 pl-3 shadow-none"
    >
      {getStatusIcon()}
      <AlertDescription className="flex items-center justify-between gap-3 text-xs">
        <div className="flex-1">
          {progress.status !== 'ready' && progress.message && (
            <p className="font-normal">{progress.message}</p>
          )}
          {progress.estimatedWait && progress.estimatedWait > 5000 && (
            <p className="mt-0.5">
              Estimated wait: ~{Math.round(progress.estimatedWait / 1000)}s
            </p>
          )}
          {progress.usedFallback && (
            <p className="mt-0.5">Switched to fallback option for faster response</p>
          )}
        </div>

        {progress.deployment && (
          <div className="flex items-center gap-1.5 ml-2 whitespace-nowrap">
            <Badge variant="outline" className="flex items-center gap-1 text-[10px] py-0.5">
              {getModelIcon(progress.deployment.modelId)}
              {progress.deployment.modelId}
            </Badge>
            {progress.deployment.region && (
              <Badge variant="secondary" className="text-[10px] py-0.5">
                {progress.deployment.region}
              </Badge>
            )}
            {progress.deployment.co2_g_per_kwh > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] py-0.5"
                title="Carbon intensity"
              >
                {progress.deployment.co2_g_per_kwh}g CO₂/kWh
              </Badge>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}






