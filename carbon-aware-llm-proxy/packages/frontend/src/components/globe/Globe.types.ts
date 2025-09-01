export interface GlobeConfig {
  // react-globe.gl configurations
  width?: number;
  height?: number;
  backgroundColor?: string;
  showAtmosphere?: boolean;
  atmosphereColor?: string;
  atmosphereAltitude?: number;
  enablePointerInteraction?: boolean;
  animateIn?: boolean;
}

export interface GlobeMarker {
  location: [number, number]; // [latitude, longitude]
  size: number;
  color?: [number, number, number];
  icon?: string; // Path to icon file
  modelId?: string; // LLM model identifier
  name?: string; // Display name
}

export interface ModelData {
  modelId: string;
  scoreQuality: number;
  scoreCost: number;
  scoreSpeed: number;
  scoreGreen: number;
  icon: string;
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

  /**
   * Currently selected model info from backend deployment
   */
  selectedModel?: {
    id: string;
    region: string | null;
  } | null;
}

export interface GlobeState {
  phi: number;
  theta: number;
  width: number;
  height: number;
}
