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
 * Normalizes coordinates to ensure they stay within bounds [-1, 1]
 */
export function normalizeCoordinates(x: number, y: number): Position {
  return {
    x: Math.max(-1, Math.min(1, x)),
    y: Math.max(-1, Math.min(1, y)),
  };
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
export const QUADRANT_CONFIG = {
  topLeft: {
    name: "topLeft",
    label: "Trust",
    color: "text-red-400",
    gradient: "from-red-500/20 to-red-600/10",
    position: { top: "top-2", left: "left-2" },
  },
  topRight: {
    name: "topRight",
    label: "Performance",
    color: "text-purple-400",
    gradient: "from-purple-500/20 to-purple-600/10",
    position: { top: "top-2", right: "right-2" },
  },
  bottomLeft: {
    name: "bottomLeft",
    label: "Efficiency",
    color: "text-green-400",
    gradient: "from-green-500/20 to-green-600/10",
    position: { bottom: "bottom-2", left: "left-2" },
  },
  bottomRight: {
    name: "bottomRight",
    label: "Simplicity",
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-blue-600/10",
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
