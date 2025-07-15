import { Repository } from 'typeorm';
import { databaseService } from './database.service';
import { CarbonFootprint } from '../entities/CarbonFootprint';
import { ModelInfo } from '../entities/ModelInfo';
import { User } from '../entities/User';
import { logger } from '../utils/logger';
import axios, { AxiosInstance } from 'axios';
import { redisService } from './redis.service';

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
  private carbonFootprintRepository!: Repository<CarbonFootprint>;
  private modelRepository!: Repository<ModelInfo>;
  private userRepository!: Repository<User>;
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
      baseURL: 'https://api.electricitymap.org/v3',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.electricityMapApiKey && { 'auth-token': this.electricityMapApiKey }),
      },
    });

    this.wattTimeClient = axios.create({
      baseURL: 'https://api2.watttime.org/v2',
      timeout: 5000,
    });

    // Check if we have all required API credentials
    if (!this.electricityMapApiKey || !this.wattTimeUsername || !this.wattTimePassword) {
      this.useMockData = true;
      logger.warn('Missing API credentials. Falling back to mock data for carbon intensity.');
    }
  }

  private initializeRepositories() {
    if (!this.carbonFootprintRepository) {
      this.carbonFootprintRepository = databaseService.getDataSource().getRepository(CarbonFootprint);
      this.modelRepository = databaseService.getDataSource().getRepository(ModelInfo);
      this.userRepository = databaseService.getDataSource().getRepository(User);
    }
  }

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
      logger.error('Redis cache error:', error);
      // Continue to fetch fresh data if cache fails
    }

    // If using mock data or missing API key
    if (this.useMockData || !this.electricityMapApiKey) {
      const mockIntensity = this.getMockCarbonIntensity(region);
      // Cache the mock value
      await redisService.set(cacheKey, { value: mockIntensity }, CACHE_TTL.CARBON_INTENSITY);
      return mockIntensity;
    }

    try {
      const response = await this.electricityMapClient.get<ElectricityMapResponse>(
        `/carbon-intensity/latest?zone=${region}`
      );
      
      const intensity = response.data.carbonIntensity;
      
      // Cache the result
      await redisService.set(cacheKey, { value: intensity }, CACHE_TTL.CARBON_INTENSITY);
      
      return intensity;
    } catch (error) {
      logger.error('Error fetching carbon intensity from Electricity Maps:', error);
      
      // Fall back to mock data if API fails
      const mockIntensity = this.getMockCarbonIntensity(region);
      // Cache the mock value with a shorter TTL
      await redisService.set(cacheKey, { value: mockIntensity }, 60); // 1 minute TTL for fallback
      
      return mockIntensity;
    }
  }

  // Get mock carbon intensity based on region
  private getMockCarbonIntensity(region: string): number {
    // Simple hash function to get a consistent but region-specific mock value
    const hash = region.split('').reduce((acc, char) => {
      return (acc * 31 + char.charCodeAt(0)) % 1000;
    }, 0);
    
    // Return a value between 50 and 500 gCO2eq/kWh
    return 50 + (hash % 450);
  }

  // Get WattTime authentication token with caching
  private async getWattTimeToken(): Promise<string | null> {
    const cacheKey = 'watttime:token';
    
    // Try to get from cache first
    try {
      const cached = await redisService.get(cacheKey);
      if (cached && cached.token && new Date(cached.expiresAt) > new Date()) {
        this.wattTimeToken = cached.token;
        this.tokenExpiry = new Date(cached.expiresAt);
        return this.wattTimeToken;
      }
    } catch (error) {
      logger.error('Redis cache error:', error);
      // Continue to fetch fresh token if cache fails
    }

    if (!this.wattTimeUsername || !this.wattTimePassword) {
      throw new Error('WattTime credentials not configured');
    }

    try {
      const response = await this.wattTimeClient.post('/login', {
        username: this.wattTimeUsername,
        password: this.wattTimePassword
      });

      this.wattTimeToken = response.data.token;
      
      if (!this.wattTimeToken) {
        throw new Error('Failed to obtain WattTime token: Empty token in response');
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
          expiresAt: expiry.toISOString() 
        },
        82800 // 23 hours in seconds
      );

      return this.wattTimeToken;
    } catch (error) {
      logger.error('Error authenticating with WattTime:', error);
      throw new Error('Failed to authenticate with WattTime');
    }
  }

  async getCarbonIntensityForecast(region: string): Promise<{ timestamp: Date; moer: number }[]> {
    const cacheKey = `carbon:${region}:forecast`;
    
    // Try to get from cache first
    try {
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return cached.map((item: any) => ({
          timestamp: new Date(item.timestamp),
          moer: item.moer
        }));
      }
    } catch (error) {
      logger.error('Redis cache error:', error);
      // Continue to fetch fresh data if cache fails
    }

    // If using mock data or missing API key
    if (this.useMockData || !this.wattTimeUsername || !this.wattTimePassword) {
      const mockForecast = this.getMockCarbonForecast(region);
      // Cache the mock forecast
      await redisService.set(
        cacheKey, 
        mockForecast.map(item => ({
          timestamp: item.timestamp.toISOString(),
          moer: item.moer
        })),
        CACHE_TTL.FORECAST
      );
      return mockForecast;
    }

    try {
      const token = await this.getWattTimeToken();
      
      const response = await this.wattTimeClient.get<WattTimeForecast[]>(
        `/forecast?ba=${region}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const forecast = response.data.map((item: any) => ({
        timestamp: new Date(item.point_time),
        moer: item.value
      }));
      
      // Cache the forecast
      await redisService.set(
        cacheKey, 
        forecast.map((item: any) => ({
          timestamp: item.timestamp.toISOString(),
          moer: item.moer
        })),
        CACHE_TTL.FORECAST
      );
      
      return forecast;
    } catch (error) {
      logger.error('Error fetching carbon intensity forecast from WattTime:', error);
      
      // Fall back to mock data if API fails
      const mockForecast = this.getMockCarbonForecast(region);
      // Cache the mock forecast with a shorter TTL
      await redisService.set(
        cacheKey, 
        mockForecast.map(item => ({
          timestamp: item.timestamp.toISOString(),
          moer: item.moer
        })),
        300 // 5 minutes TTL for fallback
      );
      
      return mockForecast;
    }
  }
  
  // Generate mock carbon forecast data
  private getMockCarbonForecast(region: string): { timestamp: Date; moer: number }[] {
    const now = new Date();
    const forecast = [];
    
    // Generate forecast for the next 24 hours
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now);
      timestamp.setHours(now.getHours() + i);
      
      // Add some variation based on time of day and region
      const hour = timestamp.getHours();
      const regionFactor = region.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100;
      
      // Base value with daily pattern (lower at night, higher during day)
      let moer = 200 + Math.sin((hour - 6) * Math.PI / 12) * 100;
      
      // Add some randomness and region-specific offset
      moer += (regionFactor % 100) - 50;
      
      // Ensure within reasonable bounds
      moer = Math.max(50, Math.min(500, moer));
      
      forecast.push({
        timestamp,
        moer: Math.round(moer)
      });
    }
    
    return forecast;
  }

  // Calculate carbon footprint for a model and token count
  async calculateCarbonFootprint(
    modelId: string,
    tokens: number,
    region?: string
  ): Promise<{
    emissions: number; // gCO2eq
    energy: number;    // kWh
    intensity: number; // gCO2eq/kWh
    region: string;
    modelName: string;
    provider: string;
  }> {
    this.initializeRepositories();
    
    const cacheKey = `footprint:${modelId}:${tokens}:${region || 'global'}`;
    
    // Try to get from cache first
    try {
      const cached = await redisService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
    } catch (error) {
      logger.error('Redis cache error:', error);
      // Continue to calculate fresh if cache fails
    }

    // Get model info
    const model = await this.modelRepository.findOne({ 
      where: { id: modelId },
      relations: ['carbonFootprints']
    });

    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Get carbon intensity for the region
    let carbonIntensity: number;
    let usedRegion = region || 'global';
    
    if (region) {
      try {
        carbonIntensity = await this.getCarbonIntensity(region);
      } catch (error) {
        logger.warn(`Failed to get carbon intensity for region ${region}, using model average`, error);
        carbonIntensity = model.carbonIntensity.avg;
        usedRegion = 'global';
      }
    } else {
      // Use model's average carbon intensity if no region is specified
      carbonIntensity = model.carbonIntensity.avg;
      usedRegion = 'global';
    }

    // Calculate energy usage (kWh per token)
    const energyPerToken = model.carbonIntensity.avg / 1_000_000; // Convert gCO2eq to kgCO2eq per token
    const energy = energyPerToken * tokens;
    
    // Calculate emissions (gCO2eq)
    const emissions = carbonIntensity * energy;
    
    const result = {
      emissions,
      energy,
      intensity: carbonIntensity,
      region: usedRegion,
      modelName: model.name,
      provider: model.provider
    };
    
    // Cache the result
    try {
      await redisService.set(cacheKey, result, CACHE_TTL.MODEL_FOOTPRINT);
    } catch (error) {
      logger.error('Failed to cache carbon footprint:', error);
    }
    
    return result;
  }

  // Get carbon savings compared to a baseline model
  async getCarbonSavings(
    modelId: string,
    baselineModelId: string,
    tokens: number,
    region?: string
  ) {
    const [modelFootprint, baselineFootprint] = await Promise.all([
      this.calculateCarbonFootprint(modelId, tokens, region),
      this.calculateCarbonFootprint(baselineModelId, tokens, region)
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
        equivalent: this.getCarbonEquivalence(savings)
      }
    };
  }

  // Get carbon statistics for a user
  async getUserCarbonStats(userId: string, timeRange: 'day' | 'week' | 'month' | 'year' = 'month') {
    this.initializeRepositories();
    
    const date = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case 'day':
        startDate.setDate(date.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(date.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(date.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(date.getFullYear() - 1);
        break;
    }

    const stats = await this.carbonFootprintRepository
      .createQueryBuilder('footprint')
      .select('SUM(footprint.emissions)', 'totalEmissions')
      .addSelect('SUM(footprint.energy)', 'totalEnergy')
      .innerJoin('footprint.message', 'message')
      .innerJoin('message.conversation', 'conversation')
      .where('conversation.userId = :userId', { userId })
      .andWhere('footprint.createdAt >= :startDate', { startDate })
      .getRawOne();

    const averageStats = await this.carbonFootprintRepository
      .createQueryBuilder('footprint')
      .select('AVG(footprint.emissions)', 'avgEmissionsPerMessage')
      .addSelect('AVG(footprint.energy)', 'avgEnergyPerMessage')
      .innerJoin('footprint.message', 'message')
      .innerJoin('message.conversation', 'conversation')
      .where('conversation.userId = :userId', { userId })
      .andWhere('footprint.createdAt >= :startDate', { startDate })
      .getRawOne();

    const modelBreakdown = await this.carbonFootprintRepository
      .createQueryBuilder('footprint')
      .select('footprint.modelName', 'model')
      .addSelect('SUM(footprint.emissions)', 'emissions')
      .addSelect('SUM(footprint.energy)', 'energy')
      .addSelect('COUNT(footprint.id)', 'messageCount')
      .innerJoin('footprint.message', 'message')
      .innerJoin('message.conversation', 'conversation')
      .where('conversation.userId = :userId', { userId })
      .andWhere('footprint.createdAt >= :startDate', { startDate })
      .groupBy('footprint.modelName')
      .orderBy('emissions', 'DESC')
      .getRawMany();

    return {
      period: timeRange,
      startDate,
      endDate: date,
      totalEmissions: parseFloat(stats.totalEmissions) || 0,
      totalEnergy: parseFloat(stats.totalEnergy) || 0,
      avgEmissionsPerMessage: parseFloat(averageStats.avgEmissionsPerMessage) || 0,
      avgEnergyPerMessage: parseFloat(averageStats.avgEnergyPerMessage) || 0,
      modelBreakdown,
      equivalent: this.getCarbonEquivalence(parseFloat(stats.totalEmissions) || 0)
    };
  }

  // Get carbon leaderboard (users with lowest carbon footprint)
  async getCarbonLeaderboard(limit: number = 10, timeRange: 'day' | 'week' | 'month' | 'year' = 'month') {
    this.initializeRepositories();
    
    const date = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case 'day':
        startDate.setDate(date.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(date.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(date.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(date.getFullYear() - 1);
        break;
    }

    const leaderboard = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.email'])
      .addSelect('SUM(footprint.emissions)', 'totalEmissions')
      .addSelect('COUNT(DISTINCT conversation.id)', 'conversationCount')
      .addSelect('COUNT(footprint.id)', 'messageCount')
      .innerJoin('user.conversations', 'conversation')
      .innerJoin('conversation.messages', 'message')
      .innerJoin('message.carbonFootprint', 'footprint')
      .where('footprint.createdAt >= :startDate', { startDate })
      .groupBy('user.id')
      .orderBy('totalEmissions', 'ASC')
      .limit(limit)
      .getRawMany();

    return leaderboard.map((user: any) => ({
      ...user,
      totalEmissions: parseFloat(user.totalEmissions) || 0,
      conversationCount: parseInt(user.conversationCount, 10) || 0,
      messageCount: parseInt(user.messageCount, 10) || 0,
      equivalent: this.getCarbonEquivalence(parseFloat(user.totalEmissions) || 0)
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
      kgCO2: kgCO2
    };
  }
}

export const carbonService = new CarbonService();
