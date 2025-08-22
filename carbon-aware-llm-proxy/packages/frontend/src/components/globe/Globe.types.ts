export interface GlobeConfig {
  devicePixelRatio?: number;
  width?: number;
  height?: number;
  phi?: number;
  theta?: number;
  dark?: number;
  diffuse?: number;
  mapSamples?: number;
  mapBrightness?: number;
  baseColor?: [number, number, number];
  markerColor?: [number, number, number];
  glowColor?: [number, number, number];
  markers?: GlobeMarker[];
  onRender?: (state: any) => void;
}

export interface GlobeMarker {
  location: [number, number]; // [latitude, longitude]
  size: number;
  color?: [number, number, number];
}

export interface RegionCoordinates {
  [region: string]: [number, number]; // [latitude, longitude]
}

export interface GlobeProps {
  /**
   * The current deployment region to highlight on the globe
   */
  activeRegion?: string | null;
  
  /**
   * Size of the globe container in pixels
   */
  size?: number;
  
  /**
   * Whether to show the globe in a loading state
   */
  isLoading?: boolean;
  
  /**
   * Custom className for styling
   */
  className?: string;
  
  /**
   * Whether the globe should auto-rotate
   */
  autoRotate?: boolean;
  
  /**
   * Rotation speed (default: 0.01)
   */
  rotationSpeed?: number;
  
  /**
   * Current preference to determine marker color
   */
  preference?: string;
}

export interface GlobeState {
  phi: number;
  theta: number;
  width: number;
  height: number;
}
