import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

// Simple database interface for Supabase
export interface Database {
  // We'll use a simple interface and let Supabase handle the types
  [key: string]: any;
}

export class SupabaseConfig {
  private static instance: SupabaseConfig;
  private client: SupabaseClient<any> | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): SupabaseConfig {
    if (!SupabaseConfig.instance) {
      SupabaseConfig.instance = new SupabaseConfig();
    }
    return SupabaseConfig.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    }

    try {
      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: false, // We handle auth via JWT tokens
        },
        db: {
          schema: 'public',
        },
      });

      // Test the connection
      const { error } = await this.client.from('users').select('count').limit(1);
      if (error && !error.message.includes('permission denied')) {
        throw error;
      }

      this.isInitialized = true;
      logger.info('Supabase client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  // Get a service role client that bypasses RLS policies
  public getServiceRoleClient(): SupabaseClient<any> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error('Missing SUPABASE_URL environment variable.');
    }

    // For development, if no service role key is provided, use the anon key with a warning
    if (!serviceRoleKey) {
      logger.warn('No SUPABASE_SERVICE_ROLE_KEY provided. Using anon key for service operations. This may fail due to RLS policies.');
      return createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
      });
    }

    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    });
  }

  public getClient(): SupabaseClient<any> {
    if (!this.client) {
      throw new Error('Supabase client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  public isConnected(): boolean {
    return this.isInitialized && this.client !== null;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      // Supabase client doesn't need explicit disconnection
      this.client = null;
      this.isInitialized = false;
      logger.info('Supabase client disconnected');
    }
  }
}

// Export singleton instance
export const supabaseConfig = SupabaseConfig.getInstance();
