import axios from "axios";
import { DataSource } from "typeorm";
import { databaseService } from "./database.service";
import { redisService } from "./redis.service";
import { ModelDeployment } from "../entities/ModelDeployment";
import { carbonService } from "./carbon.service";
import fs from "fs";
import path from "path";

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
  if (process.env.ROUTING_MOCK_ENABLED === "true") {
    return await selectMockDeploymentAndWarm(input);
  }
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

  // Helper to compute base score with carbon intensity weighting
  const baseScore = async (d: ModelDeployment) => {
    let score = (d.scoreCost / 100) * w.cost +
               (d.scoreSpeed / 100) * w.speed +
               (d.scoreQuality / 100) * w.quality +
               (d.scoreGreen / 100) * w.green;

    // Add carbon intensity factor for green preferences
    if (w.green > 0.3) {
      try {
        const carbonIntensity = await carbonService.getCarbonIntensity(d.region || "us-east");
        // Lower carbon intensity = better score for green preferences
        // Normalize carbon intensity (assuming range 80-800 gCO2eq/kWh for mock diversity)
        const normalizedCarbon = Math.max(0, Math.min(1, (carbonIntensity - 80) / 720));
        // Invert so lower carbon = higher score
        const carbonScore = (1 - normalizedCarbon) * w.green * 1.5; // Increased for better mock diversity
        score += carbonScore;
        
        // Debug logging for carbon scores
        console.log(`🌱 Carbon score for ${d.region}:`, {
          region: d.region,
          carbonIntensity,
          normalizedCarbon,
          carbonScore,
          totalScore: score
        });
      } catch (error) {
        console.warn('Failed to get carbon intensity for region:', d.region);
      }
    }

    return score;
  };

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
    const baseScoreValue = await baseScore(d);
    const score = baseScoreValue + (input.region && d.region === input.region ? 0.05 : 0);
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
        const baseScoreValue = await baseScore(d);
        const score = baseScoreValue + (input.region && d.region === input.region ? 0.05 : 0);
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

    const baseScoreValue = await baseScore(d);
    const score = baseScoreValue + (input.region && d.region === input.region ? 0.05 : 0);
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

// ----------------------------
// Mock overlay implementation
// ----------------------------
type MockModel = {
  modelId: string;
  scoreQuality: number;
  scoreCost: number;
  scoreSpeed: number;
  scoreGreen: number;
};

let _mockModelsCache: MockModel[] | null = null;

function loadMockModels(): MockModel[] {
  if (_mockModelsCache) return _mockModelsCache;
  const file = path.resolve(__dirname, "../mocks/mock-models.json");
  try {
    const raw = fs.readFileSync(file, "utf-8");
    _mockModelsCache = JSON.parse(raw);
    return _mockModelsCache!;
  } catch (e) {
    _mockModelsCache = [];
    return _mockModelsCache;
  }
}

async function findAlwaysWarmQwenDeployment(): Promise<ModelDeployment | null> {
  const ds: DataSource = databaseService.getDataSource();
  const repo = ds.getRepository(ModelDeployment);
  const all = await repo.find({ where: { status: "deployed", alwaysWarm: true } as any });
  if (!all.length) return null;
  const qwen = all.find((d) => /qwen/i.test(d.modelId));
  return qwen || all[0];
}

function dominantPreferenceFromWeights(w: Weights): "green" | "speed" | "quality" | "cost" {
  const entries: [keyof Weights, number][] = [
    ["green", w.green],
    ["speed", w.speed],
    ["quality", w.quality],
    ["cost", w.cost],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0] as any;
}

export async function selectMockDeploymentAndWarm(input: {
  joystick?: Joystick;
  weights?: Weights;
  region?: string;
  strictRegion?: boolean;
}): Promise<EnhancedRouteResponse | { error: string; message: string }> {
  const mockModels = loadMockModels();
  if (!mockModels.length) {
    return {
      error: "no_mock_models",
      message: "Mock routing enabled but no mock models are available.",
    } as any;
  }

  // Try to find a real always-warm deployment, but gracefully fall back to env endpoint
  let ingressUrl: string | null = null;
  try {
    const realDeployment = await findAlwaysWarmQwenDeployment();
    if (realDeployment && realDeployment.ingressUrl) {
      ingressUrl = realDeployment.ingressUrl;
    }
  } catch {
    // ignore DB access errors in mock mode
  }
  if (!ingressUrl) {
    ingressUrl = process.env.MODAL_ENDPOINT_URL || process.env.NEXT_PUBLIC_MODAL_ENDPOINT_URL || null;
  }
  if (!ingressUrl) {
    return {
      error: "no_available_deployments",
      message: "No deployment endpoint available. Set MODAL_ENDPOINT_URL to enable mock routing.",
    } as any;
  }

  const w =
    input.weights ??
    joystickToWeights(input.joystick?.x ?? 0, input.joystick?.y ?? 0);

  // Debug logging for mock routing
  console.log("🎮 MOCK ROUTING DEBUG:", {
    joystick: input.joystick,
    weights: w,
    dominantPreference: dominantPreferenceFromWeights(w)
  });

  const regions = [
    "us-east", "us-west", "eu-west", "ca-toronto-1",
    "eu-central", "ap-northeast", "ap-southeast", "ap-south",
    "sa-east", "af-south", "me-south", "us-central"
  ];

  type Candidate = MockModel & { region: string };
  let candidates: Candidate[] = [];
  for (const m of mockModels) {
    for (const r of regions) {
      candidates.push({ ...m, region: r });
    }
  }

  if (input.strictRegion && input.region) {
    candidates = candidates.filter((c) => c.region === input.region);
  }
  if (!candidates.length) {
    return {
      error: "no_suitable_deployments",
      message: "No mock deployments available for the specified region constraints.",
    } as any;
  }

  const baseScore = async (c: Candidate) => {
    let score = (c.scoreCost / 100) * w.cost +
               (c.scoreSpeed / 100) * w.speed +
               (c.scoreQuality / 100) * w.quality +
               (c.scoreGreen / 100) * w.green;

    // Add carbon intensity factor for green preferences
    if (w.green > 0.3) {
      try {
        const carbonIntensity = await carbonService.getCarbonIntensity(c.region);
        // Lower carbon intensity = better score for green preferences
        // Normalize carbon intensity (assuming range 80-800 gCO2eq/kWh for mock diversity)
        const normalizedCarbon = Math.max(0, Math.min(1, (carbonIntensity - 80) / 720));
        // Invert so lower carbon = higher score
        const carbonScore = (1 - normalizedCarbon) * w.green * 1.5; // Increased for better mock diversity
        score += carbonScore;
        
        // Debug logging for carbon scores
        console.log(`🌱 Carbon score for ${c.region}:`, {
          region: c.region,
          carbonIntensity,
          normalizedCarbon,
          carbonScore,
          totalScore: score
        });
      } catch (error) {
        console.warn('Failed to get carbon intensity for region:', c.region);
      }
    }

    return score;
  };

  let ideal = candidates[0];
  let idealScore = -Infinity;
  let topCandidates: { candidate: Candidate; score: number }[] = [];
  
  for (const c of candidates) {
    const baseScoreValue = await baseScore(c);
    const score = baseScoreValue + (input.region && c.region === input.region ? 0.05 : 0);
    if (score > idealScore) {
      ideal = c;
      idealScore = score;
    }
    topCandidates.push({ candidate: c, score });
  }
  
  // Enhanced diversity algorithm for better global region distribution
  let chosen = ideal;
  
  // Group candidates by region to ensure global distribution
  const regionMap = new Map<string, { candidate: Candidate; score: number }[]>();
  for (const entry of topCandidates) {
    const region = entry.candidate.region;
    if (!regionMap.has(region)) {
      regionMap.set(region, []);
    }
    regionMap.get(region)!.push(entry);
  }
  
  // Ensure we're hitting different regions more frequently
  // Increase diversity when user preferences are balanced (not extreme)
  const maxWeight = Math.max(w.green, w.speed, w.quality, w.cost);
  const isBalancedPreference = maxWeight < 0.7; // Not strongly weighted toward one preference
  
  // Enhanced diversity logic:
  // 1. 70% chance for diversity when preferences are balanced
  // 2. 50% chance even with strong preferences to ensure global spread
  const diversityChance = isBalancedPreference ? 0.7 : 0.5;
  
  if (Math.random() < diversityChance) {
    // Expanded score threshold for better diversity (top 25% instead of 10%)
    const scoreThreshold = idealScore * 0.75;
    const diverseCandidates = topCandidates.filter(c => c.score >= scoreThreshold);
    
    // Track recent regions to avoid consecutive hits on same areas
    // In a real implementation, this would use Redis or similar persistent storage
    const recentRegions = process.env.RECENT_REGIONS?.split(',') || [];
    
    // Prefer regions that haven't been selected recently
    const unvisitedCandidates = diverseCandidates.filter(c => 
      !recentRegions.includes(c.candidate.region)
    );
    
    const candidatePool = unvisitedCandidates.length > 0 ? unvisitedCandidates : diverseCandidates;
    
    if (candidatePool.length > 1) {
      // Weighted random selection favoring geographic diversity
      const regionContinent = (region: string) => {
        if (region.startsWith('us-') || region.startsWith('ca-')) return 'north_america';
        if (region.startsWith('eu-')) return 'europe';
        if (region.startsWith('ap-')) return 'asia_pacific';
        if (region.startsWith('sa-')) return 'south_america';
        if (region.startsWith('af-')) return 'africa';
        if (region.startsWith('me-')) return 'middle_east';
        return 'other';
      };
      
      const idealContinent = regionContinent(ideal.region);
      
      // Boost score for candidates from different continents (geographic diversity)
      const diversityBoostedCandidates = candidatePool.map(c => ({
        ...c,
        diversityScore: c.score + (regionContinent(c.candidate.region) !== idealContinent ? 0.15 : 0)
      }));
      
      // Sort by diversity-boosted score and pick from top options
      diversityBoostedCandidates.sort((a, b) => b.diversityScore - a.diversityScore);
      
      // Pick from top 5 candidates to maintain quality while ensuring diversity
      const topDiverseCandidates = diversityBoostedCandidates.slice(0, Math.min(5, diversityBoostedCandidates.length));
      const randomIndex = Math.floor(Math.random() * topDiverseCandidates.length);
      
      chosen = topDiverseCandidates[randomIndex].candidate;
      idealScore = topDiverseCandidates[randomIndex].score;
      
      console.log("🎲 ENHANCED DIVERSITY: Selected region for global distribution:", {
        originalBest: ideal.region,
        newSelection: chosen.region,
        originalContinent: idealContinent,
        newContinent: regionContinent(chosen.region),
        candidatesConsidered: candidatePool.length,
        diversityChance: diversityChance,
        isBalancedPreference
      });
      
      // Store recent region for future diversity tracking
      const updatedRecentRegions = [chosen.region, ...recentRegions.slice(0, 4)]; // Keep last 5 regions
      process.env.RECENT_REGIONS = updatedRecentRegions.join(',');
    }
  }

  const fallbackUsed = false;
  const warmingStarted = false;

  // Debug logging for selected model
  console.log("🎯 SELECTED MODEL:", {
    modelId: chosen.modelId,
    region: chosen.region,
    score: idealScore,
    weights: w
  });

  const chosenCo2 = await carbonService.getCarbonIntensity(chosen.region || "us-east");
  const idealCo2 = await carbonService.getCarbonIntensity(ideal.region || "us-east");

  const greenWeight = w.green;
  const speedWeight = w.speed;
  let timeoutStrategy: TimeoutStrategy;
  if (speedWeight > 0.5) {
    timeoutStrategy = 'quick';
  } else if (greenWeight > 0.3) {
    timeoutStrategy = 'patient';
  } else {
    timeoutStrategy = 'fallback';
  }

  const maxToleratedDelayMs = 10000 + w.green * 20000;
  const dominant = dominantPreferenceFromWeights(w);
  const message = `Routing to ${dominant} in ${chosen.region || "global"}.`;

  // Create unique mock deployment IDs that encode the selected model and region
  const chosenMockId = `mock-${chosen.modelId.replace(/[^a-zA-Z0-9]/g, '-')}-${chosen.region}`;
  const idealMockId = `mock-${ideal.modelId.replace(/[^a-zA-Z0-9]/g, '-')}-${ideal.region}`;

  return {
    chosen: {
      id: chosenMockId,
      appName: `mock-${chosen.modelId}`,
      modelId: chosen.modelId,
      region: chosen.region,
      ingressUrl,
      co2_g_per_kwh: chosenCo2,
    },
    ideal: {
      id: idealMockId,
      appName: `mock-${ideal.modelId}`,
      modelId: ideal.modelId,
      region: ideal.region,
      ingressUrl,
      co2_g_per_kwh: idealCo2,
    },
    fallbackUsed,
    warmingStarted,
    message,
    fallbackOptions: [],
    expectedDelay: 0,
    timeoutStrategy,
    maxToleratedDelay: maxToleratedDelayMs,
  };
}
