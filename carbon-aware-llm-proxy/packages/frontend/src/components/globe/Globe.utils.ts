import { RegionCoordinates, GlobeMarker, ModelData } from "./Globe.types";

/**
 * Mapping of region codes to their geographical coordinates
 * [latitude, longitude] in decimal degrees
 */
export const REGION_COORDINATES: RegionCoordinates = {
  "us-east": [40.7128, -74.0060],    // New York City
  "us-west": [37.7749, -122.4194],  // San Francisco
  "ca-toronto-1": [43.6532, -79.3832], // Toronto
  "eu-west": [51.5074, -0.1278],    // London
  "eu-central": [50.1109, 8.6821],  // Frankfurt, Germany
  "ap-northeast": [35.6762, 139.6503], // Tokyo, Japan
  "ap-southeast": [1.3521, 103.8198], // Singapore
  "ap-south": [19.0760, 72.8777],   // Mumbai, India
  "sa-east": [-23.5505, -46.6333],  // São Paulo, Brazil
  "af-south": [-33.9249, 18.4241],  // Cape Town, South Africa
  "me-south": [25.2048, 55.2708],   // Dubai, UAE
  "us-central": [41.8781, -87.6298], // Chicago, USA
};

/**
 * Default globe configuration for react-globe.gl
 */
export const DEFAULT_GLOBE_CONFIG = {
  backgroundColor: "rgba(0,0,0,0)",
  showAtmosphere: true,
  atmosphereColor: "#4f46e5",
  atmosphereAltitude: 0.15,
  enablePointerInteraction: true,
  animateIn: true,
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
    "eu-central": "EU Central",
    "ap-northeast": "Asia Pacific Northeast",
    "ap-southeast": "Asia Pacific Southeast",
    "ap-south": "Asia Pacific South",
    "sa-east": "South America East",
    "af-south": "Africa South",
    "me-south": "Middle East South",
    "us-central": "US Central",
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

/**
 * Create label data for a single selected model
 */
export function createModelLabel(modelId: string, activeRegion?: string | null) {
  const regionCoords = getRegionCoordinates(activeRegion || null);
  
  if (!regionCoords || !modelId) {
    return [];
  }

  const [baseLat, baseLng] = regionCoords;
  
  return [{
    lat: baseLat,
    lng: baseLng,
    modelId: modelId,
    icon: getModelIcon(modelId),
    name: getModelDisplayName(modelId),
  }];
}

/**
 * Get icon path for a given model ID
 */
// Cache to stabilize icon selection across minor modelId variant changes
const vendorIconCache: Map<string, string> = new Map();

export function getModelIcon(modelId: string): string {
  const id = (modelId || '').trim();
  if (!id) return '/icons/meta-color.svg';

  const canonical = id.toLowerCase();
  const vendor = canonical.includes('/') ? canonical.split('/')[0] : canonical;

  // Canonical direct map (lowercased keys)
  const iconMap: Record<string, string> = {
    // Databricks
    'databricks/dbrx-instruct': '/icons/Databricks_idF4fnHpaJ_0.svg',

    // Mistral models
    'mistralai/mixtral-8x7b-instruct-v0.1': '/icons/Mistral_AI_logo_(2025–).svg',
    'mistralai/ministral-8b': '/icons/Mistral_AI_logo_(2025–).svg',
    'mistralai/mistral-7b-instruct-v0.3': '/icons/Mistral_AI_logo_(2025–).svg',

    // Falcon models
    'tiiuae/falcon-180b-chat': '/icons/falcon.png',
    'tiiuae/falcon-40b-instruct': '/icons/falcon.png',

    // Grok
    'xai-org/grok-1': '/icons/Grok_Logomark_Dark.svg',

    // Meta/Llama and similar families default to Meta placeholder
    'meta-llama/llama-2-70b-chat-hf': '/icons/meta-color.svg',
    'meta-llama/llama-2-13b-chat-hf': '/icons/meta-color.svg',
    'xwin-lm/xwin-lm-70b-v0.1': '/icons/meta-color.svg',
    'wizardlm/wizardlm-70b-v1.0': '/icons/meta-color.svg',
    'internlm/internlm-chat-20b': '/icons/meta-color.svg',
    'tigerresearch/tigerbot-70b-chat': '/icons/meta-color.svg',
    'lmsys/vicuna-33b-v1.5': '/icons/meta-color.svg',

    // Qwen
    'qwen/qwen-14b-chat': '/icons/Qwen_logo.svg',

    // Baichuan
    'baichuan-inc/baichuan2-13b-chat': '/icons/baichuan-color.svg',
  };

  if (iconMap[canonical]) {
    const p = iconMap[canonical];
    if (p !== '/icons/meta-color.svg') vendorIconCache.set(vendor, p);
    console.log('Globe Utils: getModelIcon (direct) for', modelId, '->', p);
    return p;
  }

  // Heuristic fallback by vendor/model family to prevent flicker on minor ID variants
  let heuristicIcon: string | null = null;
  if (canonical.includes('mistral') || canonical.includes('mixtral')) {
    heuristicIcon = '/icons/Mistral_AI_logo_(2025–).svg';
  } else if (canonical.includes('falcon')) {
    heuristicIcon = '/icons/falcon.png';
  } else if (canonical.includes('grok')) {
    heuristicIcon = '/icons/Grok_Logomark_Dark.svg';
  } else if (canonical.includes('qwen')) {
    heuristicIcon = '/icons/Qwen_logo.svg';
  } else if (canonical.includes('baichuan')) {
    heuristicIcon = '/icons/baichuan-color.svg';
  } else if (canonical.includes('databricks') || canonical.includes('dbrx')) {
    heuristicIcon = '/icons/Databricks_idF4fnHpaJ_0.svg';
  }

  if (heuristicIcon) {
    vendorIconCache.set(vendor, heuristicIcon);
    return heuristicIcon;
  }

  // Default placeholder
  // If we have a previous non-meta icon for this vendor, reuse it to avoid flicker
  const cached = vendorIconCache.get(vendor);
  if (cached && cached !== '/icons/meta-color.svg') return cached;
  return '/icons/meta-color.svg';
}

/**
 * Get a human-readable display name from model ID
 */
export function getModelDisplayName(modelId: string): string {
  const parts = modelId.split('/');
  const modelName = parts[parts.length - 1];
  
  // Clean up common suffixes and prefixes
  return modelName
    .replace(/-instruct$|-chat$|-v0\.\d+$/, '')
    .replace(/^llama-2-|^mistral-/, '')
    .replace(/-hf$/, '')
    .replace(/\d+b-/i, '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if a model has an icon available
 */
export function hasModelIcon(modelId: string): boolean {
  return getModelIcon(modelId) !== '/icons/meta-color.svg';
}

/**
 * Globe animation configuration constants
 */
export const GLOBE_ANIMATION_CONFIG = {
  // Altitude levels for zoom phases
  NORMAL_ALTITUDE: 1.9,
  ZOOMED_OUT_ALTITUDE: 2.6,  // 25% further out
  ZOOMED_IN_ALTITUDE: 1.3,   // 25% closer in
  
  // Animation phase durations (in milliseconds)
  ZOOM_OUT_DURATION: 500,
  ROTATION_DURATION: 1000,
  ZOOM_IN_DURATION: 500,
  
  // Total animation duration
  TOTAL_DURATION: 2000,
} as const;

/**
 * Calculate the shortest rotation path between two longitude positions
 */
export function calculateShortestRotation(fromLng: number, toLng: number): number {
  const diff = toLng - fromLng;
  
  if (diff > 180) {
    return diff - 360;
  } else if (diff < -180) {
    return diff + 360;
  }
  
  return diff;
}
