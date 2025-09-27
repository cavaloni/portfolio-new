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
    // Use service role client for user creation to bypass RLS policies
    const serviceClient = supabaseConfig.getServiceRoleClient();
    const { data, error } = await serviceClient
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

  public async getCarbonFootprintsByModel(modelId: string) {
    const { data, error } = await this.client!
      .from('carbon_footprints')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching carbon footprints by model:', error);
      throw error;
    }

    return data || [];
  }

  public async deleteCarbonFootprintsByModelId(modelId: string) {
    const serviceClient = supabaseConfig.getServiceRoleClient();
    const { error } = await serviceClient
      .from('carbon_footprints')
      .delete()
      .eq('model_id', modelId);

    if (error) {
      logger.error('Error deleting carbon footprints by model:', error);
      throw error;
    }

    return { success: true };
  }

  public async getCarbonFootprintByModelAndRegion(modelId: string, region?: string) {
    let query = this.client!
      .from('carbon_footprints')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false });

    if (region) {
      query = query.eq('region', region);
    }

    // Get the most recent record
    const { data, error } = await query.limit(1).maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching carbon footprint by model/region:', error);
      throw error;
    }

    return data;
  }

  public async updateCarbonFootprint(id: string, updates: any) {
    const serviceClient = supabaseConfig.getServiceRoleClient();
    const { data, error } = await serviceClient
      .from('carbon_footprints')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating carbon footprint:', error);
      throw error;
    }

    return data;
  }

  public async getModelByProviderAndId(provider: string, id: string) {
    const { data, error } = await this.client!
      .from('model_info')
      .select('*')
      .eq('provider', provider)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching model by provider and id:', error);
      throw error;
    }

    return data;
  }

  // Messages with a "before" timestamp cursor (newest first)
  public async getMessagesByConversationIdWithBefore(conversationId: string, limit: number = 100, before?: string) {
    let query = this.client!
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching messages with before cursor:', error);
      throw error;
    }

    return data || [];
  }

  // Variant that also returns total count for pagination UI
  public async getConversationsByUserIdWithCount(userId: string, limit: number = 50, offset: number = 0) {
    const { data, error, count } = await this.client!
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching conversations (with count):', error);
      throw error;
    }

    return { data, count: count ?? 0 };
  }

  public async getModelDeploymentById(id: string) {
    const { data, error } = await this.client!
      .from('model_deployments')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching model deployment by id:', error);
      throw error;
    }

    return data;
  }

  public async getModelDeploymentsByIds(ids: string[]) {
    if (!ids.length) return [] as any[];
    const { data, error } = await this.client!
      .from('model_deployments')
      .select('*')
      .in('id', ids);

    if (error) {
      logger.error('Error fetching model deployments by ids:', error);
      throw error;
    }

    return data || [];
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

  public async getMessageById(id: string) {
    const { data, error } = await this.client!
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching message by id:', error);
      throw error;
    }

    return data;
  }

  public async deleteConversation(id: string) {
    const { error } = await this.client!
      .from('conversations')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting conversation:', error);
      throw error;
    }

    return { success: true };
  }

  public async deleteMessage(id: string) {
    const { error } = await this.client!
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }

    return { success: true };
  }

  // Model operations
  public async createModelInfo(modelData: any) {
    const serviceClient = supabaseConfig.getServiceRoleClient();
    const { data, error } = await serviceClient
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
    capability?: string;
    search?: string;
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
    if (filters?.capability) {
      // For array columns, supabase-js supports .contains([...])
      // If capabilities is jsonb or text[], this should work
      query = (query as any).contains('capabilities', [filters.capability]);
    }
    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.or(
        `name.ilike.${term},description.ilike.${term},provider.ilike.${term}`,
      );
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

  public async getModelsWithCount(filters?: {
    provider?: string;
    isActive?: boolean;
    isRecommended?: boolean;
    capability?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = this.client!.from('model_info').select('*', { count: 'exact' });

    if (filters?.provider) {
      query = query.eq('provider', filters.provider);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    if (filters?.isRecommended !== undefined) {
      query = query.eq('is_recommended', filters.isRecommended);
    }
    if (filters?.capability) {
      query = (query as any).contains('capabilities', [filters.capability]);
    }
    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.or(
        `name.ilike.${term},description.ilike.${term},provider.ilike.${term}`,
      );
    }

    query = query.order('updated_at', { ascending: false });

    if (filters?.limit) {
      const offset = filters.offset || 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching models (with count):', error);
      throw error;
    }

    return { data, count: count ?? 0 };
  }

  public async updateModelInfo(id: string, updates: any) {
    const serviceClient = supabaseConfig.getServiceRoleClient();
    const { data, error } = await serviceClient
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

  public async deleteModelInfo(id: string) {
    const serviceClient = supabaseConfig.getServiceRoleClient();
    const { error } = await serviceClient
      .from('model_info')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting model info:', error);
      throw error;
    }

    return { success: true };
  }

  // Carbon footprint operations
  public async createCarbonFootprint(footprintData: any) {
    const serviceClient = supabaseConfig.getServiceRoleClient();
    const { data, error } = await serviceClient
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
    alwaysWarm?: boolean;
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
    if (filters?.alwaysWarm !== undefined) {
      query = query.eq('always_warm', filters.alwaysWarm);
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
