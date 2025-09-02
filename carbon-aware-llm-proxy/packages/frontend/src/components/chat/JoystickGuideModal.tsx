"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";

interface JoystickGuideModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoystickGuideModal({
  isOpen,
  onOpenChange,
}: JoystickGuideModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => onOpenChange(open)}>
      <DialogContent className="fixed left-1/2 -top-[59vh] z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg bg-background/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Joystick Guide
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 text-sm">
          <p>
            The joystick helps you control how your AI requests are processed by
            balancing different priorities.
          </p>

          <div className="space-y-3">
            <h3 className="font-medium text-primary">Directions:</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-32 font-medium text-blue-400">↑ Speed</div>
                <div className="text-muted-foreground">
                  Prioritize faster response times over other factors
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-32 font-medium text-purple-400">
                  → Quality
                </div>
                <div className="text-muted-foreground">
                  Prioritize higher quality, more detailed responses
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-32 font-medium text-orange-400">↓ Cost</div>
                <div className="text-muted-foreground">
                  Prioritize cost-effective processing
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-32 font-medium text-green-400">← Green</div>
                <div className="text-muted-foreground">
                  Prioritize using green energy sources with lower carbon
                  footprint
                </div>
              </div>
              <div className="flex items-start gap-3 pt-2">
                <div className="w-32 font-medium text-foreground">Center</div>
                <div className="text-muted-foreground">
                  Balanced approach across all factors
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            <p>
              Tip: Drag the joystick in any direction to adjust your
              preferences. The further from center, the stronger the preference.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
