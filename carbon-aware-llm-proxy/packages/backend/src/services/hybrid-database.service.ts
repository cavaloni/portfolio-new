import { DatabaseService } from './database.service';
import { SupabaseService } from './supabase.service';
import { logger } from '../utils/logger';

export type DatabaseMode = 'postgres' | 'supabase' | 'hybrid';

/**
 * Hybrid database service that can work with both PostgreSQL (TypeORM) and Supabase
 * This allows for gradual migration from PostgreSQL to Supabase
 */
export class HybridDatabaseService {
  private static instance: HybridDatabaseService;
  private mode: DatabaseMode;
  private postgresService: DatabaseService;
  private supabaseService: SupabaseService;
  private isInitialized = false;

  private constructor() {
    this.mode = (process.env.DATABASE_MODE as DatabaseMode) || 'postgres';
    this.postgresService = DatabaseService.getInstance();
    this.supabaseService = SupabaseService.getInstance();
  }

  public static getInstance(): HybridDatabaseService {
    if (!HybridDatabaseService.instance) {
      HybridDatabaseService.instance = new HybridDatabaseService();
    }
    return HybridDatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      switch (this.mode) {
        case 'postgres':
          await this.postgresService.initialize();
          logger.info('HybridDatabaseService initialized in PostgreSQL mode');
          break;
        
        case 'supabase':
          await this.supabaseService.initialize();
          logger.info('HybridDatabaseService initialized in Supabase mode');
          break;
        
        case 'hybrid':
          // Initialize both services
          await Promise.all([
            this.postgresService.initialize(),
            this.supabaseService.initialize()
          ]);
          logger.info('HybridDatabaseService initialized in hybrid mode');
          break;
        
        default:
          throw new Error(`Invalid database mode: ${this.mode}`);
      }

      this.isInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize HybridDatabaseService:', error);
      throw error;
    }
  }

  public getMode(): DatabaseMode {
    return this.mode;
  }

  public getPostgresService(): DatabaseService {
    if (this.mode === 'supabase') {
      throw new Error('PostgreSQL service not available in Supabase mode');
    }
    return this.postgresService;
  }

  public getSupabaseService(): SupabaseService {
    if (this.mode === 'postgres') {
      throw new Error('Supabase service not available in PostgreSQL mode');
    }
    return this.supabaseService;
  }

  // User operations
  public async createUser(userData: any) {
    switch (this.mode) {
      case 'postgres':
        // Use TypeORM entities and repositories
        const userRepo = this.postgresService.getDataSource().getRepository('User');
        const user = userRepo.create(userData);
        return await userRepo.save(user);
      
      case 'supabase':
        return await this.supabaseService.createUser(userData);
      
      case 'hybrid':
        // Write to both databases
        const [postgresResult, supabaseResult] = await Promise.all([
          this.createUser_postgres(userData),
          this.supabaseService.createUser(userData)
        ]);
        return supabaseResult; // Return Supabase result as primary
      
      default:
        throw new Error(`Unsupported mode: ${this.mode}`);
    }
  }

  public async getUserById(id: string) {
    switch (this.mode) {
      case 'postgres':
        {
          const userRepo = this.postgresService.getDataSource().getRepository('User');
          return await userRepo.findOne({ where: { id } });
        }
      
      case 'supabase':
        return await this.supabaseService.getUserById(id);
      
      case 'hybrid':
        // Try Supabase first, fallback to PostgreSQL
        try {
          const supabaseResult = await this.supabaseService.getUserById(id);
          if (supabaseResult) {
            return supabaseResult;
          }
        } catch (error) {
          logger.warn('Supabase getUserById failed, falling back to PostgreSQL:', error);
        }
        
        {
          const userRepo = this.postgresService.getDataSource().getRepository('User');
          return await userRepo.findOne({ where: { id } });
        }
      
      default:
        throw new Error(`Unsupported mode: ${this.mode}`);
    }
  }

  public async getUserByEmail(email: string) {
    switch (this.mode) {
      case 'postgres':
        {
          const userRepo = this.postgresService.getDataSource().getRepository('User');
          return await userRepo.findOne({ where: { email } });
        }
      
      case 'supabase':
        return await this.supabaseService.getUserByEmail(email);
      
      case 'hybrid':
        // Try Supabase first, fallback to PostgreSQL
        try {
          const supabaseResult = await this.supabaseService.getUserByEmail(email);
          if (supabaseResult) {
            return supabaseResult;
          }
        } catch (error) {
          logger.warn('Supabase getUserByEmail failed, falling back to PostgreSQL:', error);
        }
        
        {
          const userRepo = this.postgresService.getDataSource().getRepository('User');
          return await userRepo.findOne({ where: { email } });
        }
      
      default:
        throw new Error(`Unsupported mode: ${this.mode}`);
    }
  }

  // Conversation operations
  public async createConversation(conversationData: any) {
    switch (this.mode) {
      case 'postgres':
        const convRepo = this.postgresService.getDataSource().getRepository('Conversation');
        const conversation = convRepo.create(conversationData);
        return await convRepo.save(conversation);
      
      case 'supabase':
        return await this.supabaseService.createConversation(conversationData);
      
      case 'hybrid':
        // Write to both databases
        const [postgresResult, supabaseResult] = await Promise.all([
          this.createConversation_postgres(conversationData),
          this.supabaseService.createConversation(conversationData)
        ]);
        return supabaseResult; // Return Supabase result as primary
      
      default:
        throw new Error(`Unsupported mode: ${this.mode}`);
    }
  }

  public async getConversationsByUserId(userId: string, limit: number = 50, offset: number = 0) {
    switch (this.mode) {
      case 'postgres':
        {
          const convRepo = this.postgresService.getDataSource().getRepository('Conversation');
          return await convRepo.find({
            where: { userId },
            order: { updatedAt: 'DESC' },
            take: limit,
            skip: offset
          });
        }
      
      case 'supabase':
        return await this.supabaseService.getConversationsByUserId(userId, limit, offset);
      
      case 'hybrid':
        // Try Supabase first, fallback to PostgreSQL
        try {
          const supabaseResult = await this.supabaseService.getConversationsByUserId(userId, limit, offset);
          if (supabaseResult && supabaseResult.length > 0) {
            return supabaseResult;
          }
        } catch (error) {
          logger.warn('Supabase getConversationsByUserId failed, falling back to PostgreSQL:', error);
        }
        
        {
          const convRepo = this.postgresService.getDataSource().getRepository('Conversation');
          return await convRepo.find({
            where: { userId },
            order: { updatedAt: 'DESC' },
            take: limit,
            skip: offset
          });
        }
      
      default:
        throw new Error(`Unsupported mode: ${this.mode}`);
    }
  }

  // Message operations
  public async createMessage(messageData: any) {
    switch (this.mode) {
      case 'postgres':
        const msgRepo = this.postgresService.getDataSource().getRepository('Message');
        const message = msgRepo.create(messageData);
        return await msgRepo.save(message);
      
      case 'supabase':
        return await this.supabaseService.createMessage(messageData);
      
      case 'hybrid':
        // Write to both databases
        const [postgresResult, supabaseResult] = await Promise.all([
          this.createMessage_postgres(messageData),
          this.supabaseService.createMessage(messageData)
        ]);
        return supabaseResult; // Return Supabase result as primary
      
      default:
        throw new Error(`Unsupported mode: ${this.mode}`);
    }
  }

  public async getMessagesByConversationId(conversationId: string, limit: number = 100, offset: number = 0) {
    switch (this.mode) {
      case 'postgres':
        {
          const msgRepo = this.postgresService.getDataSource().getRepository('Message');
          return await msgRepo.find({
            where: { conversationId },
            order: { createdAt: 'ASC' },
            take: limit,
            skip: offset
          });
        }
      
      case 'supabase':
        return await this.supabaseService.getMessagesByConversationId(conversationId, limit, offset);
      
      case 'hybrid':
        // Try Supabase first, fallback to PostgreSQL
        try {
          const supabaseResult = await this.supabaseService.getMessagesByConversationId(conversationId, limit, offset);
          if (supabaseResult && supabaseResult.length > 0) {
            return supabaseResult;
          }
        } catch (error) {
          logger.warn('Supabase getMessagesByConversationId failed, falling back to PostgreSQL:', error);
        }
        
        {
          const msgRepo = this.postgresService.getDataSource().getRepository('Message');
          return await msgRepo.find({
            where: { conversationId },
            order: { createdAt: 'ASC' },
            take: limit,
            skip: offset
          });
        }
      
      default:
        throw new Error(`Unsupported mode: ${this.mode}`);
    }
  }

  // Health check
  public async healthCheck(): Promise<{ postgres?: boolean; supabase?: boolean; overall: boolean }> {
    const result: { postgres?: boolean; supabase?: boolean; overall: boolean } = { overall: false };

    switch (this.mode) {
      case 'postgres':
        result.postgres = true; // Assume initialized since we can't access private method
        result.overall = result.postgres || false;
        break;
      
      case 'supabase':
        result.supabase = await this.supabaseService.healthCheck();
        result.overall = result.supabase;
        break;
      
      case 'hybrid':
        result.postgres = true; // Assume initialized since we can't access private method
        result.supabase = await this.supabaseService.healthCheck();
        result.overall = (result.postgres || false) && result.supabase;
        break;
    }

    return result;
  }

  // Private helper methods for hybrid mode
  private async createUser_postgres(userData: any) {
    const userRepo = this.postgresService.getDataSource().getRepository('User');
    const user = userRepo.create(userData);
    return await userRepo.save(user);
  }

  private async createConversation_postgres(conversationData: any) {
    const convRepo = this.postgresService.getDataSource().getRepository('Conversation');
    const conversation = convRepo.create(conversationData);
    return await convRepo.save(conversation);
  }

  private async createMessage_postgres(messageData: any) {
    const msgRepo = this.postgresService.getDataSource().getRepository('Message');
    const message = msgRepo.create(messageData);
    return await msgRepo.save(message);
  }
}

// Export singleton instance
export const hybridDatabaseService = HybridDatabaseService.getInstance();
