import { Position, QuadrantName } from "./QuadrantJoystick.types";

/**
 * Determines which quadrant a position falls into
 */
export function getQuadrantFromPosition(x: number, y: number): QuadrantName {
  const threshold = 0.1; // Dead zone around center

  if (Math.abs(x) < threshold && Math.abs(y) < threshold) {
    return "center";
  }

  if (x >= 0 && y >= 0) return "topRight";
  if (x < 0 && y >= 0) return "topLeft";
  if (x < 0 && y < 0) return "bottomLeft";
  return "bottomRight";
}

/**
 * Normalizes coordinates to ensure they stay within circular bounds (radius = 1)
 */
export function normalizeCoordinates(x: number, y: number): Position {
  const distance = Math.sqrt(x * x + y * y);
  
  // If outside the circle, project to the circle edge
  if (distance > 1) {
    return {
      x: x / distance,
      y: y / distance,
    };
  }
  
  return { x, y };
}

/**
 * Converts screen coordinates to normalized coordinates
 */
export function screenToNormalized(
  screenX: number,
  screenY: number,
  rect: DOMRect,
  size: number,
): Position {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const normalizedX = (screenX - centerX) / (size / 2);
  const normalizedY = -(screenY - centerY) / (size / 2); // Invert Y axis

  return normalizeCoordinates(normalizedX, normalizedY);
}

/**
 * Gets quadrant configuration data
 */
export const COMPASS_CONFIG = {
  north: {
    name: "north",
    label: "Speed",
    color: "text-blue-400",
    position: "top-1 left-1/2 -translate-x-1/2",
  },
  east: {
    name: "east", 
    label: "Quality",
    color: "text-purple-400",
    position: "right-1 top-1/2 -translate-y-1/2 rotate-90",
  },
  south: {
    name: "south",
    label: "Cost", 
    color: "text-orange-400",
    position: "bottom-1 left-1/2 -translate-x-1/2",
  },
  west: {
    name: "west",
    label: "Green",
    color: "text-green-400",
    position: "left-1 top-1/2 -translate-y-1/2 -rotate-90",
  },
  center: {
    name: "center",
    label: "Balanced",
    color: "text-gray-400",
    position: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  },
} as const;

// Keep QUADRANT_CONFIG for backward compatibility but mark as deprecated
/** @deprecated Use COMPASS_CONFIG instead */
export const QUADRANT_CONFIG = {
  topLeft: {
    name: "topLeft",
    label: "Speed",
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-blue-600/10",
    position: { top: "top-2", left: "left-2" },
  },
  topRight: {
    name: "topRight",
    label: "Quality",
    color: "text-purple-400",
    gradient: "from-purple-500/20 to-purple-600/10",
    position: { top: "top-2", right: "right-2" },
  },
  bottomLeft: {
    name: "bottomLeft",
    label: "Green",
    color: "text-green-400",
    gradient: "from-green-500/20 to-green-600/10",
    position: { bottom: "bottom-2", left: "left-2" },
  },
  bottomRight: {
    name: "bottomRight",
    label: "Cost",
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-orange-600/10",
    position: { bottom: "bottom-2", right: "right-2" },
  },
  center: {
    name: "center",
    label: "Balanced",
    color: "text-gray-400",
    gradient: "from-gray-500/20 to-gray-600/10",
    position: { top: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" },
  },
} as const;

/**
 * Creates a grid pattern for the background
 */
export function createGridPattern(
  size: number,
  gridColor: string = "rgba(255, 255, 255, 0.1)",
) {
  const gridSize = size / 8;
  return {
    backgroundImage: `
      linear-gradient(${gridColor} 1px, transparent 1px),
      linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
    `,
    backgroundSize: `${gridSize}px ${gridSize}px`,
  };
}
