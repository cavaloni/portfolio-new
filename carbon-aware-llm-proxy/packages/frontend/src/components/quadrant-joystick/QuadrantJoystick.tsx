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

  // Update position when defaultPosition changes
  useEffect(() => {
    setPosition(defaultPosition);
  }, [defaultPosition]);

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
          "relative rounded-lg border border-border bg-card",
          "transition-all duration-300",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-crosshair hover:shadow-lg",
        )}
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Grid Background */}
        <div
          className="absolute inset-0 rounded-lg opacity-30"
          style={gridStyle}
        />

        {/* Quadrant Gradients */}
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br from-red-500/10 to-transparent" />
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-purple-500/10 to-transparent" />
          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-green-500/10 to-transparent" />
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-blue-500/10 to-transparent" />
        </div>

        {/* Center Lines */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-border -translate-y-1/2" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />

        {/* Quadrant Labels */}
        <div className="absolute top-2 left-2 text-xs font-medium text-red-400 opacity-70">
          Trust
        </div>
        <div className="absolute top-2 right-2 text-xs font-medium text-purple-400 opacity-70">
          Performance
        </div>
        <div className="absolute bottom-2 left-2 text-xs font-medium text-green-400 opacity-70">
          Efficiency
        </div>
        <div className="absolute bottom-2 right-2 text-xs font-medium text-blue-400 opacity-70">
          Simplicity
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
