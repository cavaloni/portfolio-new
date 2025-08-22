"use client";

import { useState, useEffect } from "react";
import { Clock, Zap, AlertCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export interface TimeoutHandlerProps {
  isWaiting: boolean;
  expectedDelay: number;
  maxToleratedDelay: number;
  onCancel: () => void;
  onRetryFaster: () => void;
  onKeepWaiting: () => void;
  message?: string;
  deployment?: {
    modelId: string;
    region: string | null;
  };
}

export function TimeoutHandler({
  isWaiting,
  expectedDelay,
  maxToleratedDelay,
  onCancel,
  onRetryFaster,
  onKeepWaiting,
  message,
  deployment,
}: TimeoutHandlerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [showOptions, setShowOptions] = useState(false);

  // Track elapsed time
  useEffect(() => {
    if (!isWaiting) {
      setElapsed(0);
      setShowOptions(false);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const currentElapsed = Date.now() - startTime;
      setElapsed(currentElapsed);

      // Show options after 30 seconds or half the expected delay
      const optionsThreshold = Math.min(30000, expectedDelay / 2);
      if (currentElapsed > optionsThreshold && !showOptions) {
        setShowOptions(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isWaiting, expectedDelay, showOptions]);

  if (!isWaiting) {
    return null;
  }

  const elapsedSeconds = Math.round(elapsed / 1000);
  const expectedSeconds = Math.round(expectedDelay / 1000);
  const maxSeconds = Math.round(maxToleratedDelay / 1000);
  const progress = Math.min((elapsed / expectedDelay) * 100, 100);

  const isOverExpected = elapsed > expectedDelay;
  const isNearMax = elapsed > maxToleratedDelay * 0.8;

  return (
    <Alert className={`${isNearMax ? 'border-orange-200 bg-orange-50' : ''}`}>
      <Clock className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {message || `Preparing ${deployment?.modelId || 'deployment'}...`}
            </p>
            <p className="text-sm text-muted-foreground">
              {deployment?.region && `Region: ${deployment.region} • `}
              {elapsedSeconds}s elapsed
              {expectedSeconds > 0 && ` / ~${expectedSeconds}s expected`}
            </p>
          </div>
          {deployment && (
            <Badge variant="outline" className="ml-2">
              {deployment.modelId}
            </Badge>
          )}
        </div>

        {expectedDelay > 0 && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0s</span>
              <span>{expectedSeconds}s</span>
              {maxSeconds > expectedSeconds && <span>max {maxSeconds}s</span>}
            </div>
          </div>
        )}

        {isOverExpected && (
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <AlertCircle className="h-4 w-4" />
            <span>Taking longer than expected. Cold start may be slow in this region.</span>
          </div>
        )}

        {showOptions && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button 
              size="sm" 
              onClick={onRetryFaster}
              className="flex items-center gap-1"
            >
              <Zap className="h-3 w-3" />
              Try Faster Alternative
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onKeepWaiting}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Keep Waiting
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        )}

        {!showOptions && elapsedSeconds > 10 && (
          <p className="text-xs text-muted-foreground">
            Options will appear if this takes much longer...
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}






