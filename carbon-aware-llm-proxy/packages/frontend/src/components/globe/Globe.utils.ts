import { RegionCoordinates, GlobeMarker } from "./Globe.types";

/**
 * Mapping of region codes to their geographical coordinates
 * [latitude, longitude] in decimal degrees
 */
export const REGION_COORDINATES: RegionCoordinates = {
  "us-east": [40.7128, -74.0060],    // New York City
  "us-west": [37.7749, -122.4194],  // San Francisco
  "ca-toronto-1": [43.6532, -79.3832], // Toronto
  "eu-west": [51.5074, -0.1278],    // London
  "ap-southeast": [1.3521, 103.8198], // Singapore
};

/**
 * Default globe configuration optimized for the left panel
 */
export const DEFAULT_GLOBE_CONFIG = {
  devicePixelRatio: 2,
  width: 400,
  height: 400,
  phi: 0.5,
  theta: 0.5,
  dark: 0,
  diffuse: 1.2,
  mapSamples: 16000,
  mapBrightness: 2.5,
  baseColor: [0.1, 0.2, 0.4] as [number, number, number], // Darker blue for water
  markerColor: [1, 0.5, 1] as [number, number, number],
  glowColor: [1, 1, 1] as [number, number, number],
};

/**
 * Get coordinates for a given region
 */
export function getRegionCoordinates(region: string | null): [number, number] | null {
  if (!region || !REGION_COORDINATES[region]) {
    return null;
  }
  return REGION_COORDINATES[region];
}

/**
 * Create a marker for the given region
 */
export function createRegionMarker(region: string | null): GlobeMarker | null {
  const coordinates = getRegionCoordinates(region);
  if (!coordinates) return null;

  return {
    location: coordinates,
    size: 0.6,
    color: [0.2, 0.8, 1.0], // Bright blue for active region
  };
}

/**
 * Get region-specific marker color based on preference
 */
export function getMarkerColor(preference?: string): [number, number, number] {
  switch (preference) {
    case "speed":
      return [0.23, 0.51, 0.96]; // Blue
    case "green":
      return [0.13, 0.77, 0.37]; // Green
    case "cost":
      return [0.98, 0.45, 0.09]; // Orange
    case "quality":
      return [0.58, 0.20, 0.92]; // Purple
    default:
      return [0.2, 0.8, 1.0]; // Default bright blue
  }
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Get human-readable region name
 */
export function getRegionDisplayName(region: string | null): string {
  const regionMap: Record<string, string> = {
    "us-east": "US East",
    "us-west": "US West", 
    "ca-toronto-1": "Toronto",
    "eu-west": "EU West",
    "ap-southeast": "Asia Pacific",
  };

  return region ? regionMap[region] || region : "Global";
}

/**
 * Calculate the distance between two coordinates in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = degToRad(lat2 - lat1);
  const dLon = degToRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(lat1)) *
      Math.cos(degToRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
