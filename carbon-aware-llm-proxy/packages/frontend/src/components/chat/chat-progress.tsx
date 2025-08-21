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
    <Alert variant={getVariant()} className="mb-4">
      {getStatusIcon()}
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium">{progress.message}</p>
          {progress.estimatedWait && progress.estimatedWait > 5000 && (
            <p className="text-sm text-muted-foreground mt-1">
              Estimated wait: ~{Math.round(progress.estimatedWait / 1000)}s
            </p>
          )}
          {progress.usedFallback && (
            <p className="text-sm text-muted-foreground mt-1">
              Switched to fallback option for faster response
            </p>
          )}
        </div>
        
        {progress.deployment && (
          <div className="flex items-center gap-2 ml-4">
            <Badge 
              variant="outline" 
              className="flex items-center gap-1"
            >
              {getModelIcon(progress.deployment.modelId)}
              {progress.deployment.modelId}
            </Badge>
            {progress.deployment.region && (
              <Badge variant="secondary">
                {progress.deployment.region}
              </Badge>
            )}
            {progress.deployment.co2_g_per_kwh > 0 && (
              <Badge 
                variant="outline" 
                className="text-xs"
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





