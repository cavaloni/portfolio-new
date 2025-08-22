"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  QuadrantJoystickProps,
  Position,
  QuadrantPosition,
  QuadrantName,
  TooltipData,
} from "./QuadrantJoystick.types";
import {
  getQuadrantFromPosition,
  screenToNormalized,
  normalizeCoordinates,
  QUADRANT_CONFIG,
  createGridPattern,
} from "./QuadrantJoystick.utils";

export const QuadrantJoystick: React.FC<QuadrantJoystickProps> = ({
  onChange,
  defaultPosition = { x: 0, y: 0 },
  disabled = false,
  size = 320,
  showCoordinates = false,
  snapToCenter = false,
  className,
}) => {
  const [position, setPosition] = useState<Position>(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  // Note: defaultPosition is only used for initial state. Avoid syncing to it on
  // prop changes to prevent unintended resets during parent re-renders.

  // Handle position change
  const handlePositionChange = useCallback(
    (newPosition: Position) => {
      const normalized = normalizeCoordinates(newPosition.x, newPosition.y);
      const quadrant = getQuadrantFromPosition(normalized.x, normalized.y);

      setPosition(normalized);

      if (onChange) {
        onChange({ ...normalized, quadrant });
      }
    },
    [onChange],
  );

  // Handle mouse/touch events
  const handleInteractionStart = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newPosition = screenToNormalized(clientX, clientY, rect, size);

      handlePositionChange(newPosition);
      setIsDragging(true);
    },
    [disabled, size, handlePositionChange],
  );

  const handleInteractionMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || disabled || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newPosition = screenToNormalized(clientX, clientY, rect, size);

      handlePositionChange(newPosition);
    },
    [isDragging, disabled, size, handlePositionChange],
  );

  const handleInteractionEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    if (snapToCenter) {
      handlePositionChange({ x: 0, y: 0 });
    }
  }, [isDragging, snapToCenter, handlePositionChange]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleInteractionStart(e.clientX, e.clientY);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleInteractionMove(e.clientX, e.clientY);
    },
    [handleInteractionMove],
  );

  const handleMouseUp = useCallback(() => {
    handleInteractionEnd();
  }, [handleInteractionEnd]);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleInteractionStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleInteractionMove(touch.clientX, touch.clientY);
    },
    [handleInteractionMove],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      handleInteractionEnd();
    },
    [handleInteractionEnd],
  );

  // Add global event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [
    isDragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  // Calculate knob position
  const knobX = (position.x + 1) * 50;
  const knobY = (1 - position.y) * 50;

  // Calculate which compass direction is most active for enhanced glow
  const distance = Math.sqrt(position.x * position.x + position.y * position.y);
  const normalizedDistance = Math.min(distance, 1);
  const glowIntensity = normalizedDistance * 0.5; // Max 30% opacity
  
  const compassIntensity = {
    north: Math.max(0, position.y) * glowIntensity,
    east: Math.max(0, position.x) * glowIntensity,
    south: Math.max(0, -position.y) * glowIntensity,
    west: Math.max(0, -position.x) * glowIntensity,
  };

  // Handle hover tooltips
  const handleMouseEnter = (quadrant: QuadrantName) => {
    if (disabled) return;

    const config = QUADRANT_CONFIG[quadrant];
    setTooltip({
      visible: true,
      content: config.label,
      x: 0,
      y: 0,
    });
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const gridStyle = createGridPattern(size);

  return (
    <div className={cn("relative select-none", className)}>
      <div
        ref={containerRef}
        className={cn(
          "relative rounded-full border-2 border-border bg-card",
          "transition-all duration-300",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-crosshair hover:shadow-lg",
        )}
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Circular Background with subtle pattern */}
        <div 
          className="absolute inset-1 rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(148, 163, 184, 0.1) 0%, transparent 70%)'
          }}
        />

        {/* Compass Gradients - Enhanced visibility */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          {/* North - Speed (Blue) */}
          <div 
            className="absolute w-full h-1/2 top-0"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.08) 40%, transparent 80%)',
              clipPath: 'polygon(20% 100%, 80% 100%, 60% 0%, 40% 0%)'
            }}
          />
          {/* East - Quality (Purple) */}
          <div 
            className="absolute w-1/2 h-full right-0"
            style={{
              background: 'radial-gradient(ellipse 60% 80% at 0% 50%, rgba(147, 51, 234, 0.15) 0%, rgba(147, 51, 234, 0.08) 40%, transparent 80%)',
              clipPath: 'polygon(0% 20%, 0% 80%, 100% 60%, 100% 40%)'
            }}
          />
          {/* South - Cost (Orange) */}
          <div 
            className="absolute w-full h-1/2 bottom-0"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(249, 115, 22, 0.15) 0%, rgba(249, 115, 22, 0.08) 40%, transparent 80%)',
              clipPath: 'polygon(40% 100%, 60% 100%, 80% 0%, 20% 0%)'
            }}
          />
          {/* West - Green (Green) */}
          <div 
            className="absolute w-1/2 h-full left-0"
            style={{
              background: 'radial-gradient(ellipse 60% 80% at 100% 50%, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.08) 40%, transparent 80%)',
              clipPath: 'polygon(100% 40%, 100% 60%, 0% 80%, 0% 20%)'
            }}
          />
        </div>

        {/* Dynamic glow effect that responds to knob position */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          {/* North glow */}
          <div 
            className="absolute top-0 left-1/2 w-20 h-10 -translate-x-1/2 rounded-full blur-md transition-opacity duration-300"
            style={{
              backgroundColor: `rgba(59, 130, 246, ${0.1 + compassIntensity.north})`,
              transform: `translateX(-50%) scale(${1 + compassIntensity.north})`,
            }}
          />
          {/* East glow */}
          <div 
            className="absolute right-0 top-1/2 w-10 h-20 -translate-y-1/2 rounded-full blur-md transition-opacity duration-300"
            style={{
              backgroundColor: `rgba(147, 51, 234, ${0.1 + compassIntensity.east})`,
              transform: `translateY(-50%) scale(${1 + compassIntensity.east})`,
            }}
          />
          {/* South glow */}
          <div 
            className="absolute bottom-0 left-1/2 w-20 h-10 -translate-x-1/2 rounded-full blur-md transition-opacity duration-300"
            style={{
              backgroundColor: `rgba(249, 115, 22, ${0.1 + compassIntensity.south})`,
              transform: `translateX(-50%) scale(${1 + compassIntensity.south})`,
            }}
          />
          {/* West glow */}
          <div 
            className="absolute left-0 top-1/2 w-10 h-20 -translate-y-1/2 rounded-full blur-md transition-opacity duration-300"
            style={{
              backgroundColor: `rgba(34, 197, 94, ${0.1 + compassIntensity.west})`,
              transform: `translateY(-50%) scale(${1 + compassIntensity.west})`,
            }}
          />
        </div>

        {/* Compass Crosshairs */}
        <div className="absolute top-1/2 left-2 right-2 h-px bg-border/60 -translate-y-1/2" />
        <div className="absolute left-1/2 top-2 bottom-2 w-px bg-border/60 -translate-x-1/2" />
        
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-border rounded-full -translate-x-1/2 -translate-y-1/2" />

        {/* Compass Labels */}
        {/* North - Speed */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-400 opacity-80">
          Speed
        </div>
        {/* East - Quality */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-medium text-purple-400 opacity-80 origin-center rotate-90">
          Quality
        </div>
        {/* South - Cost */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-medium text-orange-400 opacity-80">
          Cost
        </div>
        {/* West - Green */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-xs font-medium text-green-400 opacity-80 origin-center -rotate-90">
          Green
        </div>

        {/* Joystick Knob */}
        <div
          ref={knobRef}
          className={cn(
            "absolute w-6 h-6 rounded-full bg-primary shadow-lg",
            "transition-all duration-300 ease-out",
            "hover:scale-110 active:scale-95",
            isDragging && "scale-110 shadow-xl",
            disabled && "cursor-not-allowed",
          )}
          style={{
            left: `${knobX}%`,
            top: `${knobY}%`,
            transform: "translate(-50%, -50%)",
            boxShadow: isDragging
              ? "0 0 20px rgba(59, 130, 246, 0.5)"
              : "0 4px 12px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
        </div>

        {/* Coordinate Display */}
        {showCoordinates && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
            ({position.x.toFixed(2)}, {position.y.toFixed(2)})
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-10 px-2 py-1 text-xs bg-popover text-popover-foreground rounded shadow-lg pointer-events-none"
          style={{
            left: "50%",
            top: "-2rem",
            transform: "translateX(-50%)",
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

QuadrantJoystick.displayName = "QuadrantJoystick";
