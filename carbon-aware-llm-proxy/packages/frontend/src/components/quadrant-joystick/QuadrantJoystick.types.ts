export type QuadrantName =
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight"
  | "center";

export interface Position {
  x: number;
  y: number;
}

export interface QuadrantPosition extends Position {
  quadrant?: QuadrantName;
}

export interface QuadrantJoystickProps {
  /**
   * Callback fired when the joystick position changes
   */
  onChange?: (position: QuadrantPosition) => void;

  /**
   * Default position of the joystick (normalized -1 to 1)
   * @default { x: 0, y: 0 }
   */
  defaultPosition?: Position;

  /**
   * Whether the joystick is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Size of the joystick container in pixels
   * @default 320
   */
  size?: number;

  /**
   * Whether to show coordinate values
   * @default false
   */
  showCoordinates?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Whether to snap to center when released
   * @default false
   */
  snapToCenter?: boolean;
}

export interface QuadrantConfig {
  name: string;
  label: string;
  color: string;
  gradient: string;
  position: { top?: string; bottom?: string; left?: string; right?: string };
}

export interface TooltipData {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}
