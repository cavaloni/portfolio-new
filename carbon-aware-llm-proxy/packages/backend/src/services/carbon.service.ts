import { logger } from "../utils/logger";
import axios, { AxiosInstance } from "axios";
import { redisService } from "./redis.service";
import { supabaseService } from "./supabase.service";
import { supabaseConfig } from "../config/supabase";

// Types for external API responses
interface ElectricityMapResponse {
  carbonIntensity: number; // gCO2eq/kWh
  fossilFuelPercentage: number;
  renewablePercentage: number;
}

interface WattTimeForecast {
  point_time: string;
  value: number; // MOER in gCO2eq/kWh
  version: string;
}

// Cache TTLs in seconds
const CACHE_TTL = {
  CARBON_INTENSITY: 300, // 5 minutes
  FORECAST: 900, // 15 minutes
  MODEL_FOOTPRINT: 3600, // 1 hour
};

class CarbonService {
  private electricityMapApiKey: string | undefined;
  private wattTimeUsername: string | undefined;
  private wattTimePassword: string | undefined;
  private wattTimeToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private electricityMapClient!: AxiosInstance;
  private wattTimeClient!: AxiosInstance;
  private useMockData: boolean = false;

  constructor() {
    this.initializeApiClients();
  }

  private initializeApiClients() {
    // Check for required environment variables
    this.electricityMapApiKey = process.env.ELECTRICITY_MAP_API_KEY;
    this.wattTimeUsername = process.env.WATT_TIME_USERNAME;
    this.wattTimePassword = process.env.WATT_TIME_PASSWORD;

    // Set up API clients with timeouts and default headers
    this.electricityMapClient = axios.create({
      baseURL: "https://api.electricitymap.org/v3",
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
        ...(this.electricityMapApiKey && {
          "auth-token": this.electricityMapApiKey,
        }),
      },
    });

    this.wattTimeClient = axios.create({
      baseURL: "https://api2.watttime.org/v2",
      timeout: 5000,
    });

    // Check if we have all required API credentials
    if (
      !this.electricityMapApiKey ||
      !this.wattTimeUsername ||
      !this.wattTimePassword
    ) {
      this.useMockData = true;
      logger.warn(
        "Missing API credentials. Falling back to mock data for carbon intensity.",
      );
    }
  }

  // No-op: repositories removed in Supabase-only refactor
  private initializeRepositories() {}

  // Get carbon intensity for a region using Electricity Maps API with Redis caching
  async getCarbonIntensity(region: string): Promise<number> {
    const cacheKey = `carbon:${region}:intensity`;

    // Try to get from cache first
    try {
      const cached = await redisService.get(cacheKey);
      if (cached !== null) {
        return cached.value;
      }
    } catch (error) {
      logger.error("Redis cache error:", error);
      // Continue to fetch fresh data if cache fails
    }

    // If using mock data or missing API key
    if (this.useMockData || !this.electricityMapApiKey) {
      const mockIntensity = this.getMockCarbonIntensity(region);
      // Cache the mock value
      await redisService.set(
        cacheKey,
        { value: mockIntensity },
        CACHE_TTL.CARBON_INTENSITY,
      );
      return mockIntensity;
    }

    try {
      const response =
        await this.electricityMapClient.get<ElectricityMapResponse>(
          `/carbon-intensity/latest?zone=${region}`,
        );

      const intensity = response.data.carbonIntensity;

      // Cache the result
      await redisService.set(
        cacheKey,
        { value: intensity },
        CACHE_TTL.CARBON_INTENSITY,
      );

      return intensity;
    } catch (error) {
      logger.error(
        "Error fetching carbon intensity from Electricity Maps:",
        error,
      );

      // Fall back to mock data if API fails
      const mockIntensity = this.getMockCarbonIntensity(region);
      // Cache the mock value with a shorter TTL
      await redisService.set(cacheKey, { value: mockIntensity }, 60); // 1 minute TTL for fallback

      return mockIntensity;
    }
  }

  // Get mock carbon intensity based on region
  private getMockCarbonIntensity(region: string): number {
    // Create much more pronounced differences between regions for better mock routing diversity
    const regionCarbonMap: { [key: string]: number } = {
      'ca-toronto-1': 80,   // Canada - extremely green (hydro/nuclear)
      'eu-central': 90,     // Germany - very green (renewables)
      'eu-west': 120,       // UK - green
      'ap-northeast': 180,  // Japan - moderate (nuclear + renewables)
      'us-west': 250,       // US West - moderate
      'us-central': 320,    // US Central - moderate
      'ap-southeast': 280,  // Singapore - moderate
      'sa-east': 200,       // Brazil - moderate (hydro)
      'us-east': 450,       // US East - higher carbon
      'ap-south': 600,      // India - high carbon (coal)
      'me-south': 700,      // UAE - very high carbon (fossil fuels)
      'af-south': 800,      // South Africa - extremely high carbon (coal)
    };
    
    // Get base value
    const baseValue = regionCarbonMap[region] || 300;
    
    // Add some randomization for mock diversity (±10% variation)
    const variation = (Math.random() - 0.5) * 0.2; // ±10%
    const randomizedValue = baseValue * (1 + variation);
    
    return Math.round(Math.max(50, randomizedValue));
  }

  // Get carbon intensity with user preference weighting (for mock routing)
  async getCarbonIntensityWithPreferences(
    region: string, 
    greenWeight: number = 0
  ): Promise<number> {
    // Use cache key that includes preference weight
    const cacheKey = `carbon:${region}:intensity:green:${greenWeight.toFixed(2)}`;

    // Try to get from cache first
    try {
      const cached = await redisService.get(cacheKey);
      if (cached !== null) {
        return cached.value;
      }
    } catch (error) {
      logger.error("Redis cache error:", error);
    }

    // Calculate preference-based carbon intensity
    let carbonIntensity: number;
    
    if (this.useMockData || !this.electricityMapApiKey) {
      carbonIntensity = this.getMockCarbonIntensityWithPreferences(region, greenWeight);
    } else {
      // For real API data, we'd still apply preference weighting
      try {
        const baseIntensity = await this.getCarbonIntensity(region);
        carbonIntensity = this.applyPreferenceWeighting(baseIntensity, greenWeight);
      } catch (error) {
        carbonIntensity = this.getMockCarbonIntensityWithPreferences(region, greenWeight);
      }
    }

    // Cache the result
    await redisService.set(
      cacheKey,
      { value: carbonIntensity },
      CACHE_TTL.CARBON_INTENSITY,
    );

    return carbonIntensity;
  }

  // Get mock carbon intensity based on region and user preferences
  private getMockCarbonIntensityWithPreferences(region: string, greenWeight: number): number {
    // Base regional carbon intensity (varies by region)
    const regionalVariation = this.getMockCarbonIntensity(region);
    
    // Best case: 80 gCO2eq/kWh (when fully green)
    // Worst case: 800 gCO2eq/kWh (when fully performance-focused)
    const bestCarbon = 80;
    const worstCarbon = 800;
    
    // Interpolate based on green weight
    // greenWeight: 1.0 = fully green (use best)
    // greenWeight: 0.0 = not green (use worst)
    const preferenceBasedCarbon = worstCarbon - (greenWeight * (worstCarbon - bestCarbon));
    
    // Blend with regional variation (60% preference, 40% regional)
    const blendedCarbon = (preferenceBasedCarbon * 0.6) + (regionalVariation * 0.4);
    
    // Ensure we stay within realistic bounds
    return Math.round(Math.max(50, Math.min(900, blendedCarbon)));
  }

  // Apply preference weighting to real carbon intensity data
  private applyPreferenceWeighting(baseIntensity: number, greenWeight: number): number {
    // For real data, we simulate that green-conscious users get routed to 
    // cleaner energy sources, while performance-focused users might get
    // less optimal routing
    const adjustmentFactor = 0.3; // 30% adjustment range
    const adjustment = (0.5 - greenWeight) * adjustmentFactor;
    
    const adjustedIntensity = baseIntensity * (1 + adjustment);
    return Math.round(Math.max(50, adjustedIntensity));
  }

  // Get WattTime authentication token with caching
  private async getWattTimeToken(): Promise<string | null> {
    const cacheKey = "watttime:token";

    // Try to get from cache first
    try {
      const cached = await redisService.get(cacheKey);
      if (cached && cached.token && new Date(cached.expiresAt) > new Date()) {
        this.wattTimeToken = cached.token;
        this.tokenExpiry = new Date(cached.expiresAt);
        return this.wattTimeToken;
      }
    } catch (error) {
      logger.error("Redis cache error:", error);
      // Continue to fetch fresh token if cache fails
    }

    if (!this.wattTimeUsername || !this.wattTimePassword) {
      throw new Error("WattTime credentials not configured");
    }

    try {
      const response = await this.wattTimeClient.post("/login", {
        username: this.wattTimeUsername,
        password: this.wattTimePassword,
      });

      this.wattTimeToken = response.data.token;

      if (!this.wattTimeToken) {
        throw new Error(
          "Failed to obtain WattTime token: Empty token in response",
        );
      }

      // Set token expiry to 23 hours from now (tokens typically expire after 24h)
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 23);
      this.tokenExpiry = expiry;

      // Cache the token
      await redisService.set(
        cacheKey,
        {
          token: this.wattTimeToken,
          expiresAt: expiry.toISOString(),
        },
        82800, // 23 hours in seconds
      );

      return this.wattTimeToken;
    } catch (error) {
      logger.error("Error authenticating with WattTime:", error);
      throw new Error("Failed to authenticate with WattTime");
    }
  }

  async getCarbonIntensityForecast(
    region: string,
  ): Promise<{ timestamp: Date; moer: number }[]> {
    const cacheKey = `carbon:${region}:forecast`;

    // Try to get from cache first
    try {
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return cached.map((item: any) => ({
          timestamp: new Date(item.timestamp),
          moer: item.moer,
        }));
      }
    } catch (error) {
      logger.error("Redis cache error:", error);
      // Continue to fetch fresh data if cache fails
    }

    // If using mock data or missing API key
    if (this.useMockData || !this.wattTimeUsername || !this.wattTimePassword) {
      const mockForecast = this.getMockCarbonForecast(region);
      // Cache the mock forecast
      await redisService.set(
        cacheKey,
        mockForecast.map((item) => ({
          timestamp: item.timestamp.toISOString(),
          moer: item.moer,
        })),
        CACHE_TTL.FORECAST,
      );
      return mockForecast;
    }

    try {
      const token = await this.getWattTimeToken();

      const response = await this.wattTimeClient.get<WattTimeForecast[]>(
        `/forecast?ba=${region}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const forecast = response.data.map((item: any) => ({
        timestamp: new Date(item.point_time),
        moer: item.value,
      }));

      // Cache the forecast
      await redisService.set(
        cacheKey,
        forecast.map((item: any) => ({
          timestamp: item.timestamp.toISOString(),
          moer: item.moer,
        })),
        CACHE_TTL.FORECAST,
      );

      return forecast;
    } catch (error) {
      logger.error(
        "Error fetching carbon intensity forecast from WattTime:",
        error,
      );

      // Fall back to mock data if API fails
      const mockForecast = this.getMockCarbonForecast(region);
      // Cache the mock forecast with a shorter TTL
      await redisService.set(
        cacheKey,
        mockForecast.map((item) => ({
          timestamp: item.timestamp.toISOString(),
          moer: item.moer,
        })),
        300, // 5 minutes TTL for fallback
      );

      return mockForecast;
    }
  }

  // Generate mock carbon forecast data
  private getMockCarbonForecast(
    region: string,
  ): { timestamp: Date; moer: number }[] {
    const now = new Date();
    const forecast = [];

    // Generate forecast for the next 24 hours
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now);
      timestamp.setHours(now.getHours() + i);

      // Add some variation based on time of day and region
      const hour = timestamp.getHours();
      const regionFactor =
        region.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
        100;

      // Base value with daily pattern (lower at night, higher during day)
      let moer = 200 + Math.sin(((hour - 6) * Math.PI) / 12) * 100;

      // Add some randomness and region-specific offset
      moer += (regionFactor % 100) - 50;

      // Ensure within reasonable bounds
      moer = Math.max(50, Math.min(500, moer));

      forecast.push({
        timestamp,
        moer: Math.round(moer),
      });
    }

    return forecast;
  }

  // Calculate carbon footprint for a model and token count
  async calculateCarbonFootprint(
    modelId: string,
    tokens: number,
    region?: string,
  ): Promise<{
    emissions: number; // gCO2eq
    energy: number; // kWh
    intensity: number; // gCO2eq/kWh
    region: string;
    modelName: string;
    provider: string;
  }> {
    const cacheKey = `footprint:${modelId}:${tokens}:${region || "global"}`;

    // Try to get from cache first
    try {
      const cached = await redisService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
    } catch (error) {
      logger.error("Redis cache error:", error);
      // Continue to calculate fresh if cache fails
    }

    // Get model info via Supabase
    const model: any = await supabaseService.getModelById(modelId);

    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Get carbon intensity for the region
    let carbonIntensity: number;
    let usedRegion = region || "global";

    if (region) {
      try {
        carbonIntensity = await this.getCarbonIntensity(region);
      } catch (error) {
        logger.warn(
          `Failed to get carbon intensity for region ${region}, using model average`,
          error,
        );
        carbonIntensity = model.carbonIntensity.avg;
        usedRegion = "global";
      }
    } else {
      // Use model's average carbon intensity if no region is specified
      const avg = (model?.carbon_intensity?.avg ?? model?.carbonIntensity?.avg ?? null);
      carbonIntensity = avg ?? 300; // fallback average
      usedRegion = "global";
    }

    // Calculate energy usage per token (using model's energy data)
    // Prefer energy_per_token (Wh/token); otherwise estimate from average carbon intensity
    const energyPerToken = ((): number => {
      const ept = Number(model?.energy_per_token ?? model?.energyPerToken ?? 0);
      if (ept && !Number.isNaN(ept)) return ept;
      const avg = Number(model?.carbon_intensity?.avg ?? model?.carbonIntensity?.avg ?? 300);
      // Estimate Wh per token from avg gCO2e/kWh assuming ~300 g/kWh baseline
      return avg / 300000;
    })();
    const energy = (energyPerToken * tokens) / 1000; // Convert Wh to kWh

    // Calculate emissions: energy (kWh) * carbon intensity (gCO2eq/kWh)
    const emissions = energy * carbonIntensity;

    const result = {
      emissions,
      energy,
      intensity: carbonIntensity,
      region: usedRegion,
      modelName: model.name,
      provider: model.provider,
    };

    // Cache the result
    try {
      await redisService.set(cacheKey, result, CACHE_TTL.MODEL_FOOTPRINT);
    } catch (error) {
      logger.error("Failed to cache carbon footprint:", error);
    }

    return result;
  }

  // Get carbon savings compared to a baseline model
  async getCarbonSavings(
    modelId: string,
    baselineModelId: string,
    tokens: number,
    region?: string,
  ) {
    const [modelFootprint, baselineFootprint] = await Promise.all([
      this.calculateCarbonFootprint(modelId, tokens, region),
      this.calculateCarbonFootprint(baselineModelId, tokens, region),
    ]);

    const savings = baselineFootprint.emissions - modelFootprint.emissions;
    const savingsPercentage = (savings / baselineFootprint.emissions) * 100;

    return {
      model: modelFootprint,
      baseline: baselineFootprint,
      savings: {
        absolute: savings,
        percentage: savingsPercentage,
        tokens,
        equivalent: this.getCarbonEquivalence(savings),
      },
    };
  }

  // Get carbon statistics for a user
  async getUserCarbonStats(
    userId: string,
    timeRange: "day" | "week" | "month" | "year" = "month",
  ) {
    const date = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case "day":
        startDate.setDate(date.getDate() - 1);
        break;
      case "week":
        startDate.setDate(date.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(date.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(date.getFullYear() - 1);
        break;
    }

    // Supabase path: conversations -> messages -> footprints
    const client = supabaseConfig.getServiceRoleClient();
    // Get conversations for this user
    const { data: convos, error: convErr } = await client
      .from('conversations')
      .select('id')
      .eq('user_id', userId);
    if (convErr) {
      logger.error('Error fetching conversations for user stats:', convErr);
      throw convErr;
    }
    const convoIds = (convos || []).map((c: any) => c.id);
    if (convoIds.length === 0) {
      return {
        period: timeRange,
        startDate,
        endDate: date,
        totalEmissions: 0,
        totalEnergy: 0,
        avgEmissionsPerMessage: 0,
        avgEnergyPerMessage: 0,
        modelBreakdown: [],
        equivalent: this.getCarbonEquivalence(0),
      };
    }
    // Get messages in period for these conversations
    const { data: messages, error: msgErr } = await client
      .from('messages')
      .select('id, created_at')
      .in('conversation_id', convoIds)
      .gte('created_at', startDate.toISOString());
    if (msgErr) {
      logger.error('Error fetching messages for user stats:', msgErr);
      throw msgErr;
    }
    const messageIds = (messages || []).map((m: any) => m.id);
    if (messageIds.length === 0) {
      return {
        period: timeRange,
        startDate,
        endDate: date,
        totalEmissions: 0,
        totalEnergy: 0,
        avgEmissionsPerMessage: 0,
        avgEnergyPerMessage: 0,
        modelBreakdown: [],
        equivalent: this.getCarbonEquivalence(0),
      };
    }
    // Get footprints for these messages in period
    const { data: fps, error: fpErr } = await client
      .from('carbon_footprints')
      .select('emissions, energy, model_name, created_at')
      .in('message_id', messageIds)
      .gte('created_at', startDate.toISOString());
    if (fpErr) {
      logger.error('Error fetching footprints for user stats:', fpErr);
      throw fpErr;
    }
    const totalEmissions = (fps || []).reduce((sum: number, r: any) => sum + Number(r.emissions || 0), 0);
    const totalEnergy = (fps || []).reduce((sum: number, r: any) => sum + Number(r.energy || 0), 0);
    const count = (fps || []).length;

    const avgEmissionsPerMessage = count ? totalEmissions / count : 0;
    const avgEnergyPerMessage = count ? totalEnergy / count : 0;

    const breakdownMap = new Map<string, { emissions: number; energy: number; messageCount: number }>();
    for (const r of fps || []) {
      const model = r.model_name || 'unknown';
      const entry = breakdownMap.get(model) || { emissions: 0, energy: 0, messageCount: 0 };
      entry.emissions += Number(r.emissions || 0);
      entry.energy += Number(r.energy || 0);
      entry.messageCount += 1;
      breakdownMap.set(model, entry);
    }
    const modelBreakdown = Array.from(breakdownMap.entries())
      .map(([model, v]) => ({ model, emissions: v.emissions, energy: v.energy, messageCount: v.messageCount }))
      .sort((a, b) => b.emissions - a.emissions);

    return {
      period: timeRange,
      startDate,
      endDate: date,
      totalEmissions,
      totalEnergy,
      avgEmissionsPerMessage,
      avgEnergyPerMessage,
      modelBreakdown,
      equivalent: this.getCarbonEquivalence(
        totalEmissions,
      ),
    };
  }

  // Get carbon leaderboard (users with lowest carbon footprint)
  async getCarbonLeaderboard(
    limit: number = 10,
    timeRange: "day" | "week" | "month" | "year" = "month",
  ) {
    this.initializeRepositories();

    const date = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case "day":
        startDate.setDate(date.getDate() - 1);
        break;
      case "week":
        startDate.setDate(date.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(date.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(date.getFullYear() - 1);
        break;
    }

    // Supabase aggregation for leaderboard
    const client = supabaseConfig.getServiceRoleClient();
    // Fetch footprints in period
    const { data: fpsLb, error: fpLbErr } = await client
      .from('carbon_footprints')
      .select('message_id, emissions, created_at, model_name')
      .gte('created_at', startDate.toISOString());
    if (fpLbErr) {
      logger.error('Error fetching footprints for leaderboard:', fpLbErr);
      throw fpLbErr;
    }
    if (!fpsLb || fpsLb.length === 0) return [];
    const msgIds = Array.from(new Set(fpsLb.map((f: any) => f.message_id)));
    const { data: msgsLb, error: msgsLbErr } = await client
      .from('messages')
      .select('id, conversation_id')
      .in('id', msgIds);
    if (msgsLbErr) {
      logger.error('Error fetching messages for leaderboard:', msgsLbErr);
      throw msgsLbErr;
    }
    const convoIdSet = new Set<string>((msgsLb || []).map((m: any) => m.conversation_id));
    const { data: convosLb, error: convosLbErr } = await client
      .from('conversations')
      .select('id, user_id')
      .in('id', Array.from(convoIdSet));
    if (convosLbErr) {
      logger.error('Error fetching conversations for leaderboard:', convosLbErr);
      throw convosLbErr;
    }
    const convoToUser = new Map<string, string>();
    for (const c of convosLb || []) convoToUser.set(c.id, c.user_id);
    const msgToConvo = new Map<string, string>();
    for (const m of msgsLb || []) msgToConvo.set(m.id, m.conversation_id);

    const userAgg = new Map<string, { totalEmissions: number; conversations: Set<string>; messageCount: number }>();
    for (const f of fpsLb) {
      const convoId = msgToConvo.get(f.message_id);
      const userIdForMsg = convoId ? convoToUser.get(convoId) : undefined;
      if (!userIdForMsg) continue;
      const agg = userAgg.get(userIdForMsg) || { totalEmissions: 0, conversations: new Set<string>(), messageCount: 0 };
      agg.totalEmissions += Number(f.emissions || 0);
      if (convoId) agg.conversations.add(convoId);
      agg.messageCount += 1;
      userAgg.set(userIdForMsg, agg);
    }
    const rows = Array.from(userAgg.entries()).map(([uid, v]) => ({
      id: uid,
      totalEmissions: v.totalEmissions,
      conversationCount: v.conversations.size,
      messageCount: v.messageCount,
    }));
    rows.sort((a, b) => (a.totalEmissions ?? 0) - (b.totalEmissions ?? 0));
    const limited = rows.slice(0, limit);
    // Optionally fetch user info (name/email) for these users
    const userIds = limited.map((r) => r.id);
    let usersById = new Map<string, any>();
    if (userIds.length) {
      const { data: users, error: usersErr } = await client
        .from('users')
        .select('id, name, email')
        .in('id', userIds);
      if (!usersErr && users) {
        usersById = new Map(users.map((u: any) => [u.id, u]));
      }
    }
    return limited.map((u) => ({
      id: u.id,
      name: usersById.get(u.id)?.name ?? null,
      email: usersById.get(u.id)?.email ?? null,
      totalEmissions: u.totalEmissions,
      conversationCount: u.conversationCount,
      messageCount: u.messageCount,
      equivalent: this.getCarbonEquivalence(u.totalEmissions),
    }));
  }

  // Helper method to get carbon equivalence in human-readable terms
  private getCarbonEquivalence(emissionsInGrams: number) {
    const kgCO2 = emissionsInGrams / 1000;

    // Source: https://www.epa.gov/energy/greenhouse-gases-equivalencies-calculator-calculations-and-references
    return {
      milesDriven: (kgCO2 * 1000) / 404, // 404 g/mile for average gasoline car
      smartphonesCharged: (kgCO2 * 1000) / 8.22, // 8.22 kg CO2 per smartphone charged for a year
      treeSeedlingsGrown: kgCO2 / 21.77, // 21.77 kg CO2 sequestered by one tree seedling grown for 10 years
      trashBagsRecycled: kgCO2 / 2.86, // 2.86 kg CO2 per trash bag of waste recycled instead of landfilled
      lightBulbs: (kgCO2 * 1000) / 454, // 454 g CO2 per 60W incandescent bulb for a day
      kgCO2: kgCO2,
    };
  }
}

export const carbonService = new CarbonService();
