import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabase';
import { logger } from '../utils/logger';

/**
 * Supabase service that provides database operations using Supabase client
 * This service acts as a bridge between the existing TypeORM-based code and Supabase
 */
export class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient<any> | null = null;

  private constructor() {}

  public async initialize(): Promise<void> {
    try {
      await supabaseConfig.initialize();
      this.client = supabaseConfig.getClient();
      logger.info('SupabaseService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SupabaseService:', error);
      throw error;
    }
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public getClient(): SupabaseClient<any> {
    if (!this.client) {
      throw new Error('SupabaseService not initialized. Call initialize() first.');
    }
    return this.client;
  }

  // User operations
  public async createUser(userData: any) {
    const { data, error } = await this.client!
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating user:', error);
      throw error;
    }

    return data;
  }

  public async getUserById(id: string) {
    const { data, error } = await this.client!
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error('Error fetching user:', error);
      throw error;
    }

    return data;
  }

  public async getUserByEmail(email: string) {
    const { data, error } = await this.client!
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching user by email:', error);
      throw error;
    }

    return data;
  }

  public async updateUser(id: string, updates: any) {
    const { data, error } = await this.client!
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating user:', error);
      throw error;
    }

    return data;
  }

  // Conversation operations
  public async createConversation(conversationData: any) {
    const { data, error } = await this.client!
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating conversation:', error);
      throw error;
    }

    return data;
  }

  public async getConversationById(id: string) {
    const { data, error } = await this.client!
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching conversation:', error);
      throw error;
    }

    return data;
  }

  public async getConversationsByUserId(userId: string, limit: number = 50, offset: number = 0) {
    const { data, error } = await this.client!
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching conversations:', error);
      throw error;
    }

    return data;
  }

  public async updateConversation(id: string, updates: any) {
    const { data, error } = await this.client!
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating conversation:', error);
      throw error;
    }

    return data;
  }

  // Message operations
  public async createMessage(messageData: any) {
    const { data, error } = await this.client!
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating message:', error);
      throw error;
    }

    return data;
  }

  public async getMessagesByConversationId(conversationId: string, limit: number = 100, offset: number = 0) {
    const { data, error } = await this.client!
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching messages:', error);
      throw error;
    }

    return data;
  }

  public async updateMessage(id: string, updates: any) {
    const { data, error } = await this.client!
      .from('messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating message:', error);
      throw error;
    }

    return data;
  }

  // Model operations
  public async createModelInfo(modelData: any) {
    const { data, error } = await this.client!
      .from('model_info')
      .insert(modelData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating model info:', error);
      throw error;
    }

    return data;
  }

  public async getModelById(id: string) {
    const { data, error } = await this.client!
      .from('model_info')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching model:', error);
      throw error;
    }

    return data;
  }

  public async getModels(filters?: {
    provider?: string;
    isActive?: boolean;
    isRecommended?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let query = this.client!.from('model_info').select('*');

    if (filters?.provider) {
      query = query.eq('provider', filters.provider);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    if (filters?.isRecommended !== undefined) {
      query = query.eq('is_recommended', filters.isRecommended);
    }

    query = query.order('updated_at', { ascending: false });

    if (filters?.limit) {
      const offset = filters.offset || 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching models:', error);
      throw error;
    }

    return data;
  }

  public async updateModelInfo(id: string, updates: any) {
    const { data, error } = await this.client!
      .from('model_info')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating model info:', error);
      throw error;
    }

    return data;
  }

  // Carbon footprint operations
  public async createCarbonFootprint(footprintData: any) {
    const { data, error } = await this.client!
      .from('carbon_footprints')
      .insert(footprintData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating carbon footprint:', error);
      throw error;
    }

    return data;
  }

  public async getCarbonFootprintByMessageId(messageId: string) {
    const { data, error } = await this.client!
      .from('carbon_footprints')
      .select('*')
      .eq('message_id', messageId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching carbon footprint:', error);
      throw error;
    }

    return data;
  }

  // Model deployment operations
  public async createModelDeployment(deploymentData: any) {
    const { data, error } = await this.client!
      .from('model_deployments')
      .insert(deploymentData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating model deployment:', error);
      throw error;
    }

    return data;
  }

  public async getModelDeployments(filters?: {
    modelId?: string;
    region?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = this.client!.from('model_deployments').select('*');

    if (filters?.modelId) {
      query = query.eq('model_id', filters.modelId);
    }
    if (filters?.region) {
      query = query.eq('region', filters.region);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('preference', { ascending: true });

    if (filters?.limit) {
      const offset = filters.offset || 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching model deployments:', error);
      throw error;
    }

    return data;
  }

  public async updateModelDeployment(id: string, updates: any) {
    const { data, error } = await this.client!
      .from('model_deployments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating model deployment:', error);
      throw error;
    }

    return data;
  }

  // Transaction support (using Supabase RPC for complex operations)
  public async executeTransaction<T>(operations: (client: SupabaseClient<any>) => Promise<T>): Promise<T> {
    // Supabase doesn't have explicit transactions like traditional SQL databases
    // For complex operations, we can use RPC functions or handle rollback manually
    try {
      return await operations(this.client!);
    } catch (error) {
      logger.error('Transaction failed:', error);
      throw error;
    }
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client!
        .from('users')
        .select('count')
        .limit(1);

      return !error || error.message.includes('permission denied'); // Permission denied is OK for health check
    } catch (error) {
      logger.error('Supabase health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const supabaseService = SupabaseService.getInstance();
