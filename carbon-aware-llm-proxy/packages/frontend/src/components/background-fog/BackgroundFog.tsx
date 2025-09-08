"use client";

import React, { useMemo } from 'react';
import { JoystickPosition } from '@/services/routing-service';

interface BackgroundFogProps {
  joystickPosition: JoystickPosition;
  className?: string;
}

export const BackgroundFog: React.FC<BackgroundFogProps> = ({
  joystickPosition,
  className = "",
}) => {
  // Define the preference colors (matching the joystick component)
  const preferenceColors = {
    speed: { r: 59, g: 130, b: 246 },    // Blue
    quality: { r: 147, g: 51, b: 234 },   // Purple
    cost: { r: 249, g: 115, b: 22 },     // Orange
    green: { r: 34, g: 197, b: 94 },     // Green
  };

  // Calculate the dominant color based on joystick position
  const backgroundStyle = useMemo(() => {
    const { x, y } = joystickPosition;

    // Normalize coordinates to [0, 1] range
    const normalizedX = (x + 1) / 2; // [-1, 1] -> [0, 1]
    const normalizedY = (y + 1) / 2; // [-1, 1] -> [0, 1]
    
    // Calculate blend weights for each quadrant
    const weights = {
      // Top-right (Speed + Quality)
      speedQuality: normalizedX * normalizedY,
      // Top-left (Speed + Green)
      speedGreen: (1 - normalizedX) * normalizedY,
      // Bottom-right (Cost + Quality)
      costQuality: normalizedX * (1 - normalizedY),
      // Bottom-left (Cost + Green)
      costGreen: (1 - normalizedX) * (1 - normalizedY),
    };

    // Calculate primary direction weights
    const speedWeight = normalizedY; // Higher Y = more speed
    const qualityWeight = normalizedX; // Higher X = more quality
    const costWeight = 1 - normalizedY; // Lower Y = more cost
    const greenWeight = 1 - normalizedX; // Lower X = more green

    // Blend colors based on weights
    let r = 0, g = 0, b = 0;
    
    r += preferenceColors.speed.r * speedWeight;
    g += preferenceColors.speed.g * speedWeight;
    b += preferenceColors.speed.b * speedWeight;
    
    r += preferenceColors.quality.r * qualityWeight;
    g += preferenceColors.quality.g * qualityWeight;
    b += preferenceColors.quality.b * qualityWeight;
    
    r += preferenceColors.cost.r * costWeight;
    g += preferenceColors.cost.g * costWeight;
    b += preferenceColors.cost.b * costWeight;
    
    r += preferenceColors.green.r * greenWeight;
    g += preferenceColors.green.g * greenWeight;
    b += preferenceColors.green.b * greenWeight;

    // Normalize by total weight
    const totalWeight = speedWeight + qualityWeight + costWeight + greenWeight;
    r = Math.round(r / totalWeight);
    g = Math.round(g / totalWeight);
    b = Math.round(b / totalWeight);

    // Create subtle gradient effects - increased visibility for testing
    const centerAlpha = 0.15; // More visible center for testing
    const edgeAlpha = 0.06; // More visible edges for testing

    return {
      background: `
        radial-gradient(
          ellipse 120% 100% at center,
          rgba(${r}, ${g}, ${b}, ${centerAlpha}) 0%,
          rgba(${r}, ${g}, ${b}, ${centerAlpha * 0.6}) 30%,
          rgba(${r}, ${g}, ${b}, ${centerAlpha * 0.3}) 60%,
          rgba(${r}, ${g}, ${b}, ${edgeAlpha}) 80%,
          transparent 100%
        ),
        radial-gradient(
          ellipse 200% 150% at 25% 75%,
          rgba(${r}, ${g}, ${b}, ${edgeAlpha * 0.8}) 0%,
          transparent 60%
        ),
        radial-gradient(
          ellipse 180% 120% at 75% 25%,
          rgba(${r}, ${g}, ${b}, ${edgeAlpha * 0.8}) 0%,
          transparent 60%
        )
      `,
    };
  }, [joystickPosition]);

  return (
    <div
      className={`fixed inset-0 pointer-events-none transition-all duration-1000 ease-out ${className}`}
      style={backgroundStyle}
      aria-hidden="true"
    />
  );
};
