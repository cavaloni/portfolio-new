import axios from "axios";
import { DataSource } from "typeorm";
import { databaseService } from "./database.service";
import { redisService } from "./redis.service";
import { ModelDeployment } from "../entities/ModelDeployment";
import { carbonService } from "./carbon.service";

export type Joystick = { x: number; y: number };
export type Weights = {
  cost: number;
  speed: number;
  quality: number;
  green: number;
};

export function joystickToWeights(x: number, y: number): Weights {
  const quality = Math.max(0, x);
  const green = Math.max(0, -x);
  const speed = Math.max(0, y);
  const cost = Math.max(0, -y);
  const sum = quality + green + speed + cost || 1;
  return {
    quality: quality / sum,
    green: green / sum,
    speed: speed / sum,
    cost: cost / sum,
  };
}

// Calculate appropriate timeout based on strategy and user preferences
export function calculateTimeoutMs(
  strategy: TimeoutStrategy,
  greenWeight: number = 0,
  expectedDelay: number = 0
): number {
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
}

// Timeout strategies based on user preferences and deployment state
export type TimeoutStrategy = 'quick' | 'patient' | 'fallback';

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

export interface EnhancedRouteResponse {
  chosen: {
    id: string;
    appName: string;
    modelId: string;
    region: string | null;
    ingressUrl: string | null;
    co2_g_per_kwh: number;
  };
  ideal: {
    id: string;
    appName: string;
    modelId: string;
    region: string | null;
    ingressUrl: string | null;
    co2_g_per_kwh: number;
  };
  fallbackUsed: boolean;
  warmingStarted: boolean;
  message: string;
  // NEW: Enhanced fallback support
  fallbackOptions: FallbackOption[];
  expectedDelay: number;
  timeoutStrategy: TimeoutStrategy;
  maxToleratedDelay: number;
}

export async function selectDeploymentAndWarm(input: {
  joystick?: Joystick;
  weights?: Weights;
  region?: string;
  strictRegion?: boolean;
}): Promise<EnhancedRouteResponse | { error: string; message: string }> {
  const ds: DataSource = databaseService.getDataSource();
  const repo = ds.getRepository(ModelDeployment);
  const deployments = await repo.find({ where: { status: "deployed" } as any });

  if (!deployments.length) {
    return {
      error: "no_available_deployments",
      message:
        "No suitable deployments available. Try adjusting preferences or check back later.",
    };
  }

  const w =
    input.weights ??
    joystickToWeights(input.joystick?.x ?? 0, input.joystick?.y ?? 0);

  // Helper to compute base score
  const baseScore = (d: ModelDeployment) =>
    (d.scoreCost / 100) * w.cost +
    (d.scoreSpeed / 100) * w.speed +
    (d.scoreQuality / 100) * w.quality +
    (d.scoreGreen / 100) * w.green;

  // Ideal without cold penalty (pure preference)
  const candidates = deployments.filter((d) => {
    if (
      input.strictRegion &&
      d.region &&
      input.region &&
      d.region !== input.region
    )
      return false;
    return true;
  });
  if (!candidates.length) {
    return {
      error: "no_suitable_deployments",
      message: "No deployments available for the specified region constraints.",
    };
  }

  let ideal = candidates[0];
  let idealScore = -Infinity;
  for (const d of candidates) {
    const score =
      baseScore(d) + (input.region && d.region === input.region ? 0.05 : 0);
    if (score > idealScore) {
      ideal = d;
      idealScore = score;
    }
  }

  // Warm flags
  const warmFlags = await Promise.all(
    deployments.map((d) => redisService.get(`warm:${d.appName}`)),
  );
  const warmById = new Map<string, boolean>();
  deployments.forEach((d, i) => warmById.set(d.id, Boolean(warmFlags[i])));

  const idealIsWarm = warmById.get(ideal.id) || false;

  // If ideal is cold, trigger background warm with a soft lock
  let warmingStarted = false;
  if (!idealIsWarm) {
    const lockKey = `warming:${ideal.appName}`;
    const lockExists = await redisService.get(lockKey);
    if (!lockExists) {
      // Best-effort lock by setting a short TTL key
      await redisService.set(lockKey, { t: Date.now() }, 90);
      warmingStarted = true;
      // Fire-and-forget warmup
      (async () => {
        try {
          if (!ideal.ingressUrl) return;
          await axios.post(
            `${ideal.ingressUrl}/warmup`,
            {},
            { timeout: 15000 },
          );
          // Mark warm with TTL ~ scaledown window
          const ttl = Math.max(60, ideal.scaledownWindowSec || 180);
          await redisService.set(`warm:${ideal.appName}`, true, ttl);
        } catch {
          // ignore
        }
      })();
    }
  }

  // Tolerance logic: higher green weight = more tolerance for delays
  const maxToleratedDelayMs = 10000 + w.green * 20000; // 10s base + up to 20s for full green
  const estimatedColdDelayMs = 45000; // Mock 45s; TODO: real from pings/historical
  const maxScoreDrop = 0.1 + w.green * 0.2; // Higher green = more tolerance for score fallback

  // Choose chosen deployment: ideal if warm or delay acceptable; else best warm fallback
  let chosen = ideal;
  let fallbackUsed = false;

  if (!idealIsWarm) {
    // Check if delay is tolerable for ideal
    const delayTolerable = estimatedColdDelayMs <= maxToleratedDelayMs;

    if (!delayTolerable) {
      // Find best warm fallback
      let bestWarm = null as ModelDeployment | null;
      let bestWarmScore = -Infinity;
      for (const d of candidates) {
        if (!warmById.get(d.id)) continue;
        const score =
          baseScore(d) + (input.region && d.region === input.region ? 0.05 : 0);
        if (score > bestWarmScore) {
          bestWarm = d;
          bestWarmScore = score;
        }
      }

      // Use fallback only if score drop is acceptable
      if (bestWarm && idealScore - bestWarmScore <= maxScoreDrop) {
        chosen = bestWarm;
        fallbackUsed = true;
      }
      // If no acceptable fallback, stick with ideal (accept cold start)
    }
  }

  // Mock carbon intensities (replace with WattTime/ElectricityMap later)
  const chosenCo2 = await carbonService.getCarbonIntensity(
    chosen.region || "us-east",
  ); // TODO: region mapping
  const idealCo2 = await carbonService.getCarbonIntensity(
    ideal.region || "us-east",
  ); // TODO: region mapping

  // Generate ranked fallback options (exclude chosen deployment)
  const fallbackOptions: FallbackOption[] = [];
  for (const d of candidates) {
    if (d.id === chosen.id) continue; // Skip the chosen deployment
    
    const score = baseScore(d) + (input.region && d.region === input.region ? 0.05 : 0);
    const isWarm = warmById.get(d.id) || false;
    const co2 = await carbonService.getCarbonIntensity(d.region || "us-east");
    
    fallbackOptions.push({
      id: d.id,
      appName: d.appName,
      modelId: d.modelId,
      region: d.region,
      ingressUrl: d.ingressUrl,
      co2_g_per_kwh: co2,
      score,
      isWarm,
    });
  }
  
  // Sort fallbacks by score (best first), prioritizing warm deployments
  fallbackOptions.sort((a, b) => {
    if (a.isWarm !== b.isWarm) return a.isWarm ? -1 : 1; // Warm first
    return b.score - a.score; // Then by score
  });

  // Determine timeout strategy based on user preferences and deployment state
  const greenWeight = w.green;
  const speedWeight = w.speed;
  
  let timeoutStrategy: TimeoutStrategy;
  if (speedWeight > 0.5) {
    timeoutStrategy = 'quick'; // Speed-focused users get quick timeouts
  } else if (greenWeight > 0.3 && !idealIsWarm) {
    timeoutStrategy = 'patient'; // Green users are more patient for cold starts
  } else {
    timeoutStrategy = 'fallback'; // Balanced approach with fallback options
  }

  const message = fallbackUsed
    ? `Using a warm ${chosen.preference || "deployment"} in ${chosen.region || "global"} while preparing a greener region (${ideal.region || "global"}).`
    : !idealIsWarm
      ? `Preparing your ${ideal.preference || "deployment"} in ${ideal.region || "global"}. This may take ~45 seconds.`
      : ideal.preference === "green"
        ? `Routing to your green preference in ${ideal.region || "global"}.`
        : `Routing to ${ideal.preference || "deployment"} in ${ideal.region || "global"}.`;

  return {
    chosen: {
      id: chosen.id,
      appName: chosen.appName,
      modelId: chosen.modelId,
      region: chosen.region,
      ingressUrl: chosen.ingressUrl,
      co2_g_per_kwh: chosenCo2, // mock; TODO: replace with WattTime
    },
    ideal: {
      id: ideal.id,
      appName: ideal.appName,
      modelId: ideal.modelId,
      region: ideal.region,
      ingressUrl: ideal.ingressUrl,
      co2_g_per_kwh: idealCo2, // mock; TODO: replace with WattTime
    },
    fallbackUsed,
    warmingStarted: !idealIsWarm && warmingStarted,
    message,
    // NEW: Enhanced fallback support
    fallbackOptions: fallbackOptions.slice(0, 3), // Limit to top 3 fallbacks
    expectedDelay: !idealIsWarm ? estimatedColdDelayMs : 0,
    timeoutStrategy,
    maxToleratedDelay: maxToleratedDelayMs,
  };
}
