import { apiPost, withAuth } from "@/lib/api-client";

export interface JoystickPosition {
  x: number;
  y: number;
}

export interface Weights {
  cost: number;
  speed: number;
  quality: number;
  green: number;
}

export interface DeploymentInfo {
  id: string;
  appName: string;
  modelId: string;
  region: string | null;
  ingressUrl: string | null;
  co2_g_per_kwh: number;
}

export interface FallbackOption {
  id: string;
  appName: string;
  modelId: string;
  region: string | null;
  ingressUrl: string | null;
  co2_g_per_kwh: number;
  score: number;
  isWarm: boolean;
}

export type TimeoutStrategy = 'quick' | 'patient' | 'fallback';

export interface RouteResponse {
  chosen: DeploymentInfo;
  ideal: DeploymentInfo;
  fallbackUsed: boolean;
  warmingStarted: boolean;
  message: string;
  // NEW: Enhanced fallback support
  fallbackOptions: FallbackOption[];
  expectedDelay: number;
  timeoutStrategy: TimeoutStrategy;
  maxToleratedDelay: number;
}

export interface RouteError {
  error: string;
  message: string;
}

export interface RouteRequest {
  joystick?: JoystickPosition;
  weights?: Partial<Weights>;
  region?: string;
  strictRegion?: boolean;
}

export const routingService = {
  async getRouting(request: RouteRequest): Promise<RouteResponse | RouteError> {
    try {
      const response = await apiPost<RouteResponse>("/v1/route", request, {
        headers: withAuth(),
      });

      if (response.error) {
        return {
          error: "routing_error",
          message: response.error.message || "Failed to get routing decision",
        };
      }

      if (!response.data) {
        return {
          error: "no_response",
          message: "No routing response received",
        };
      }

      return response.data;
    } catch (error) {
      console.error("Routing service error:", error);
      return {
        error: "network_error",
        message: "Failed to connect to routing service",
      };
    }
  },

  // Helper to convert joystick to readable preference
  getPreferenceFromJoystick(joystick: JoystickPosition): string {
    const { x, y } = joystick;

    // Determine primary direction
    if (Math.abs(x) > Math.abs(y)) {
      return x > 0 ? "quality" : "green";
    } else {
      return y > 0 ? "speed" : "cost";
    }
  },

  // Helper to format region display
  formatRegion(region: string | null): string {
    if (!region) return "Global";

    // Convert region codes to readable names
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

    return regionMap[region] || region;
  },

  // Helper to get fallback deployment IDs for chat service
  getFallbackIds(routing: RouteResponse): string[] {
    return routing.fallbackOptions.map(f => f.id);
  },

  // Helper to calculate timeout based on strategy and green weight
  calculateTimeout(strategy: TimeoutStrategy, greenWeight: number = 0, expectedDelay: number = 0): number {
    const baseTimeout = 15000; // 15s for normal requests
    const patientTimeout = 45000; // 45s for expected cold starts
    const maxTimeout = 90000; // 90s absolute maximum
    
    switch (strategy) {
      case 'quick':
        return baseTimeout;
      case 'patient':
        // Green users get more patience (1x to 3x)
        const patienceMultiplier = 1 + (greenWeight * 2);
        return Math.min(patientTimeout * patienceMultiplier, maxTimeout);
      case 'fallback':
        // Use expected delay + buffer, but cap at max
        return Math.min(Math.max(expectedDelay + 15000, baseTimeout), maxTimeout);
      default:
        return baseTimeout;
    }
  },

  // Helper to get user-friendly timeout description
  getTimeoutDescription(strategy: TimeoutStrategy, timeout: number): string {
    const seconds = Math.round(timeout / 1000);
    switch (strategy) {
      case 'quick':
        return `Quick response (${seconds}s timeout)`;
      case 'patient':
        return `Patient for sustainability (${seconds}s timeout)`;
      case 'fallback':
        return `Smart fallback (${seconds}s timeout)`;
      default:
        return `${seconds}s timeout`;
    }
  },
};
