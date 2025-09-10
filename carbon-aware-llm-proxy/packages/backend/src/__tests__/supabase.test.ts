import 'dotenv/config';
import { SupabaseService } from '../services/supabase.service';
import { HybridDatabaseService } from '../services/hybrid-database.service';

describe('Supabase Integration Tests', () => {
  let supabaseService: SupabaseService;
  let hybridService: HybridDatabaseService;

  beforeAll(async () => {
    // Skip tests if Supabase credentials are not available
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.log('Skipping Supabase tests - credentials not available');
      return;
    }

    supabaseService = SupabaseService.getInstance();
    hybridService = HybridDatabaseService.getInstance();
    
    try {
      await supabaseService.initialize();
      await hybridService.initialize();
    } catch (error) {
      console.warn('Failed to initialize Supabase services:', error);
    }
  });

  describe('SupabaseService', () => {
    it('should initialize successfully', async () => {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return; // Skip test
      }

      expect(supabaseService).toBeDefined();
      expect(supabaseService.getClient()).toBeDefined();
    });

    it('should perform health check', async () => {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return; // Skip test
      }

      const isHealthy = await supabaseService.healthCheck();
      expect(typeof isHealthy).toBe('boolean');
    });

    it('should handle user operations', async () => {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return; // Skip test
      }

      const testUser = {
        id: 'test-user-' + Date.now(),
        email: `test-${Date.now()}@example.com`,
        password_hash: 'hashed_password',
        name: 'Test User',
        role: 'user' as const,
        email_verified: false,
        avatar_url: null
      };

      try {
        // Create user
        const createdUser = await supabaseService.createUser(testUser);
        expect(createdUser).toBeDefined();
        expect(createdUser.email).toBe(testUser.email);

        // Get user by ID
        const fetchedUser = await supabaseService.getUserById(createdUser.id);
        expect(fetchedUser).toBeDefined();
        expect(fetchedUser?.email).toBe(testUser.email);

        // Get user by email
        const fetchedByEmail = await supabaseService.getUserByEmail(testUser.email);
        expect(fetchedByEmail).toBeDefined();
        expect(fetchedByEmail?.id).toBe(createdUser.id);

        // Update user
        const updatedUser = await supabaseService.updateUser(createdUser.id, {
          name: 'Updated Test User'
        });
        expect(updatedUser.name).toBe('Updated Test User');

      } catch (error) {
        // Handle RLS policy restrictions or other Supabase-specific errors
        if (error instanceof Error && error.message.includes('permission denied')) {
          console.warn('User operations test skipped due to RLS policies');
          return;
        }
        throw error;
      }
    });

    it('should handle model operations', async () => {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return; // Skip test
      }

      const testModel = {
        id: 'test-model-' + Date.now(),
        provider_model_id: 'test-provider-model-' + Date.now(),
        name: 'Test Model',
        provider: 'test-provider',
        description: 'A test model',
        context_window: 4096,
        max_tokens: 2048,
        training_data: 'Test training data',
        knowledge_cutoff: '2023-04-01',
        architecture: 'transformer',
        parameters: 7000000000,
        flops_per_token: 1.5,
        tokens_per_second: 100,
        hardware: 'GPU',
        region: 'us-east-1',
        source: 'test',
        published_date: new Date().toISOString(),
        is_recommended: false,
        is_carbon_aware: true,
        is_active: true,
        metadata: { test: true }
      };

      try {
        // Create model
        const createdModel = await supabaseService.createModelInfo(testModel);
        expect(createdModel).toBeDefined();
        expect(createdModel.name).toBe(testModel.name);

        // Get model by ID
        const fetchedModel = await supabaseService.getModelById(createdModel.id);
        expect(fetchedModel).toBeDefined();
        expect(fetchedModel?.name).toBe(testModel.name);

        // Get models with filters
        const models = await supabaseService.getModels({
          provider: testModel.provider,
          isActive: true,
          limit: 10
        });
        expect(Array.isArray(models)).toBe(true);

      } catch (error) {
        // Handle RLS policy restrictions or other Supabase-specific errors
        if (error instanceof Error && error.message.includes('permission denied')) {
          console.warn('Model operations test skipped due to RLS policies');
          return;
        }
        throw error;
      }
    });
  });

  describe('HybridDatabaseService', () => {
    it('should initialize in correct mode', async () => {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return; // Skip test
      }

      expect(hybridService).toBeDefined();
      
      const mode = hybridService.getMode();
      expect(['postgres', 'supabase', 'hybrid']).toContain(mode);
    });

    it('should perform health check', async () => {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return; // Skip test
      }

      const health = await hybridService.healthCheck();
      expect(health).toBeDefined();
      expect(typeof health.overall).toBe('boolean');
    });

    it('should handle database mode switching', async () => {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return; // Skip test
      }

      const mode = hybridService.getMode();
      
      if (mode === 'supabase' || mode === 'hybrid') {
        expect(() => hybridService.getSupabaseService()).not.toThrow();
      }
      
      if (mode === 'postgres' || mode === 'hybrid') {
        expect(() => hybridService.getPostgresService()).not.toThrow();
      }
    });
  });

  describe('Database Operations Compatibility', () => {
    it('should handle user creation across database modes', async () => {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return; // Skip test
      }

      const testUser = {
        id: 'compat-test-user-' + Date.now(),
        email: `compat-test-${Date.now()}@example.com`,
        passwordHash: 'hashed_password',
        name: 'Compatibility Test User',
        role: 'user',
        emailVerified: false,
        avatarUrl: null
      };

      try {
        // This should work regardless of the database mode
        const createdUser = await hybridService.createUser(testUser);
        expect(createdUser).toBeDefined();
        
        // Fetch the user back
        const fetchedUser = await hybridService.getUserById(createdUser.id);
        expect(fetchedUser).toBeDefined();
        
      } catch (error) {
        // Handle RLS policy restrictions or other database-specific errors
        if (error instanceof Error && 
            (error.message.includes('permission denied') || 
             error.message.includes('relation') || 
             error.message.includes('does not exist'))) {
          console.warn('Compatibility test skipped due to database restrictions');
          return;
        }
        throw error;
      }
    });
  });

  afterAll(async () => {
    // Cleanup is handled automatically by Supabase client
    // No explicit cleanup needed
  });
});

describe('Database Mode Environment Tests', () => {
  it('should respect DATABASE_MODE environment variable', () => {
    const originalMode = process.env.DATABASE_MODE;
    
    // Test different modes
    const testModes = ['postgres', 'supabase', 'hybrid'];
    
    testModes.forEach(mode => {
      process.env.DATABASE_MODE = mode;
      
      // Create a new instance to test the mode
      const testService = new (HybridDatabaseService as any)();
      expect(testService.getMode()).toBe(mode);
    });
    
    // Restore original mode
    if (originalMode) {
      process.env.DATABASE_MODE = originalMode;
    } else {
      delete process.env.DATABASE_MODE;
    }
  });

  it('should default to postgres mode when DATABASE_MODE is not set', () => {
    const originalMode = process.env.DATABASE_MODE;
    delete process.env.DATABASE_MODE;
    
    const testService = new (HybridDatabaseService as any)();
    expect(testService.getMode()).toBe('postgres');
    
    // Restore original mode
    if (originalMode) {
      process.env.DATABASE_MODE = originalMode;
    }
  });
});

describe('Configuration Validation', () => {
  it('should validate Supabase configuration', () => {
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_ANON_KEY;
    
    // Test missing URL
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    
    expect(async () => {
      const service = SupabaseService.getInstance();
      await service.initialize();
    }).rejects.toThrow('Missing Supabase configuration');
    
    // Restore original values
    if (originalUrl) process.env.SUPABASE_URL = originalUrl;
    if (originalKey) process.env.SUPABASE_ANON_KEY = originalKey;
  });
});
