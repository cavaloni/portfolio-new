#!/usr/bin/env ts-node

/**
 * Data Migration Script: PostgreSQL to Supabase
 * 
 * This script migrates existing data from PostgreSQL to Supabase.
 * It handles the migration of all entities while preserving relationships and data integrity.
 * 
 * Usage:
 *   npm run migrate-data-to-supabase [--dry-run] [--batch-size=1000] [--table=users]
 * 
 * Options:
 *   --dry-run: Preview the migration without actually transferring data
 *   --batch-size: Number of records to process in each batch (default: 1000)
 *   --table: Migrate only a specific table (users, conversations, messages, etc.)
 */

import 'dotenv/config';
import 'reflect-metadata';
import { Command } from 'commander';
import { DatabaseService } from '../packages/backend/src/services/database.service';
import { SupabaseService } from '../packages/backend/src/services/supabase.service';
import { logger } from '../packages/backend/src/utils/logger';

interface MigrationOptions {
  dryRun: boolean;
  batchSize: number;
  table?: string;
}

interface MigrationStats {
  table: string;
  totalRecords: number;
  migratedRecords: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
}

class DataMigrator {
  private postgresService: DatabaseService;
  private supabaseService: SupabaseService;
  private stats: MigrationStats[] = [];

  constructor() {
    this.postgresService = DatabaseService.getInstance();
    this.supabaseService = SupabaseService.getInstance();
  }

  async initialize() {
    logger.info('Initializing database connections...');
    await this.postgresService.initialize();
    await this.supabaseService.initialize();
    logger.info('Database connections established');
  }

  async migrateUsers(options: MigrationOptions): Promise<MigrationStats> {
    const stats: MigrationStats = {
      table: 'users',
      totalRecords: 0,
      migratedRecords: 0,
      errors: 0,
      startTime: new Date()
    };

    try {
      const userRepository = this.postgresService.getDataSource().getRepository('User');
      const totalUsers = await userRepository.count();
      stats.totalRecords = totalUsers;

      logger.info(`Starting migration of ${totalUsers} users...`);

      if (options.dryRun) {
        logger.info('[DRY RUN] Would migrate users table');
        stats.migratedRecords = totalUsers;
        stats.endTime = new Date();
        return stats;
      }

      let offset = 0;
      while (offset < totalUsers) {
        const users = await userRepository.find({
          skip: offset,
          take: options.batchSize,
          order: { createdAt: 'ASC' }
        });

        for (const user of users) {
          try {
            // Transform PostgreSQL user to Supabase format
            const supabaseUser = {
              id: user.id,
              email: user.email,
              password_hash: user.passwordHash,
              name: user.name,
              role: user.role,
              email_verified: user.emailVerified,
              avatar_url: user.avatarUrl,
              created_at: user.createdAt.toISOString(),
              updated_at: user.updatedAt.toISOString()
            };

            await this.supabaseService.createUser(supabaseUser);
            stats.migratedRecords++;
            
            if (stats.migratedRecords % 100 === 0) {
              logger.info(`Migrated ${stats.migratedRecords}/${totalUsers} users`);
            }
          } catch (error) {
            logger.error(`Error migrating user ${user.id}:`, error);
            stats.errors++;
          }
        }

        offset += options.batchSize;
      }

      stats.endTime = new Date();
      logger.info(`Users migration completed: ${stats.migratedRecords}/${stats.totalRecords} migrated, ${stats.errors} errors`);
      
    } catch (error) {
      logger.error('Error during users migration:', error);
      stats.endTime = new Date();
      throw error;
    }

    return stats;
  }

  async migrateModelInfo(options: MigrationOptions): Promise<MigrationStats> {
    const stats: MigrationStats = {
      table: 'model_info',
      totalRecords: 0,
      migratedRecords: 0,
      errors: 0,
      startTime: new Date()
    };

    try {
      const modelRepository = this.postgresService.getDataSource().getRepository('ModelInfo');
      const totalModels = await modelRepository.count();
      stats.totalRecords = totalModels;

      logger.info(`Starting migration of ${totalModels} model info records...`);

      if (options.dryRun) {
        logger.info('[DRY RUN] Would migrate model_info table');
        stats.migratedRecords = totalModels;
        stats.endTime = new Date();
        return stats;
      }

      let offset = 0;
      while (offset < totalModels) {
        const models = await modelRepository.find({
          skip: offset,
          take: options.batchSize,
          order: { createdAt: 'ASC' }
        });

        for (const model of models) {
          try {
            // Transform PostgreSQL model to Supabase format
            const supabaseModel = {
              id: model.id,
              provider_model_id: model.providerModelId,
              name: model.name,
              provider: model.provider,
              description: model.description,
              context_window: model.contextWindow,
              max_tokens: model.maxTokens,
              training_data: model.trainingData,
              knowledge_cutoff: model.knowledgeCutoff,
              architecture: model.architecture,
              parameters: model.parameters,
              flops_per_token: model.flopsPerToken,
              tokens_per_second: model.tokensPerSecond,
              hardware: model.hardware,
              region: model.region,
              source: model.source,
              published_date: model.publishedDate?.toISOString(),
              is_recommended: model.isRecommended,
              is_carbon_aware: model.isCarbonAware,
              is_active: model.isActive,
              metadata: model.metadata,
              last_updated: model.lastUpdated?.toISOString(),
              created_at: model.createdAt.toISOString(),
              updated_at: model.updatedAt.toISOString()
            };

            await this.supabaseService.createModelInfo(supabaseModel);
            stats.migratedRecords++;
            
            if (stats.migratedRecords % 50 === 0) {
              logger.info(`Migrated ${stats.migratedRecords}/${totalModels} models`);
            }
          } catch (error) {
            logger.error(`Error migrating model ${model.id}:`, error);
            stats.errors++;
          }
        }

        offset += options.batchSize;
      }

      stats.endTime = new Date();
      logger.info(`Model info migration completed: ${stats.migratedRecords}/${stats.totalRecords} migrated, ${stats.errors} errors`);
      
    } catch (error) {
      logger.error('Error during model info migration:', error);
      stats.endTime = new Date();
      throw error;
    }

    return stats;
  }

  async migrateConversations(options: MigrationOptions): Promise<MigrationStats> {
    const stats: MigrationStats = {
      table: 'conversations',
      totalRecords: 0,
      migratedRecords: 0,
      errors: 0,
      startTime: new Date()
    };

    try {
      const conversationRepository = this.postgresService.getDataSource().getRepository('Conversation');
      const totalConversations = await conversationRepository.count();
      stats.totalRecords = totalConversations;

      logger.info(`Starting migration of ${totalConversations} conversations...`);

      if (options.dryRun) {
        logger.info('[DRY RUN] Would migrate conversations table');
        stats.migratedRecords = totalConversations;
        stats.endTime = new Date();
        return stats;
      }

      let offset = 0;
      while (offset < totalConversations) {
        const conversations = await conversationRepository.find({
          skip: offset,
          take: options.batchSize,
          order: { createdAt: 'ASC' }
        });

        for (const conversation of conversations) {
          try {
            // Transform PostgreSQL conversation to Supabase format
            const supabaseConversation = {
              id: conversation.id,
              title: conversation.title,
              user_id: conversation.userId,
              status: conversation.status,
              metadata: conversation.metadata,
              model_id: conversation.modelId,
              temperature: conversation.temperature,
              max_tokens: conversation.maxTokens,
              carbon_aware: conversation.carbonAware,
              message_count: conversation.messageCount,
              total_tokens: conversation.totalTokens,
              total_emissions: conversation.totalEmissions,
              total_energy: conversation.totalEnergy,
              created_at: conversation.createdAt.toISOString(),
              updated_at: conversation.updatedAt.toISOString()
            };

            await this.supabaseService.createConversation(supabaseConversation);
            stats.migratedRecords++;
            
            if (stats.migratedRecords % 100 === 0) {
              logger.info(`Migrated ${stats.migratedRecords}/${totalConversations} conversations`);
            }
          } catch (error) {
            logger.error(`Error migrating conversation ${conversation.id}:`, error);
            stats.errors++;
          }
        }

        offset += options.batchSize;
      }

      stats.endTime = new Date();
      logger.info(`Conversations migration completed: ${stats.migratedRecords}/${stats.totalRecords} migrated, ${stats.errors} errors`);
      
    } catch (error) {
      logger.error('Error during conversations migration:', error);
      stats.endTime = new Date();
      throw error;
    }

    return stats;
  }

  async migrateMessages(options: MigrationOptions): Promise<MigrationStats> {
    const stats: MigrationStats = {
      table: 'messages',
      totalRecords: 0,
      migratedRecords: 0,
      errors: 0,
      startTime: new Date()
    };

    try {
      const messageRepository = this.postgresService.getDataSource().getRepository('Message');
      const totalMessages = await messageRepository.count();
      stats.totalRecords = totalMessages;

      logger.info(`Starting migration of ${totalMessages} messages...`);

      if (options.dryRun) {
        logger.info('[DRY RUN] Would migrate messages table');
        stats.migratedRecords = totalMessages;
        stats.endTime = new Date();
        return stats;
      }

      let offset = 0;
      while (offset < totalMessages) {
        const messages = await messageRepository.find({
          skip: offset,
          take: options.batchSize,
          order: { createdAt: 'ASC' }
        });

        for (const message of messages) {
          try {
            // Transform PostgreSQL message to Supabase format
            const supabaseMessage = {
              id: message.id,
              conversation_id: message.conversationId,
              role: message.role,
              content: message.content,
              model_id: message.modelId,
              tokens: message.tokens,
              is_streaming: message.isStreaming,
              is_complete: message.isComplete,
              metadata: message.metadata,
              parent_message_id: message.parentMessageId,
              created_at: message.createdAt.toISOString()
            };

            await this.supabaseService.createMessage(supabaseMessage);
            stats.migratedRecords++;
            
            if (stats.migratedRecords % 500 === 0) {
              logger.info(`Migrated ${stats.migratedRecords}/${totalMessages} messages`);
            }
          } catch (error) {
            logger.error(`Error migrating message ${message.id}:`, error);
            stats.errors++;
          }
        }

        offset += options.batchSize;
      }

      stats.endTime = new Date();
      logger.info(`Messages migration completed: ${stats.migratedRecords}/${stats.totalRecords} migrated, ${stats.errors} errors`);
      
    } catch (error) {
      logger.error('Error during messages migration:', error);
      stats.endTime = new Date();
      throw error;
    }

    return stats;
  }

  async migrateCarbonFootprints(options: MigrationOptions): Promise<MigrationStats> {
    const stats: MigrationStats = {
      table: 'carbon_footprints',
      totalRecords: 0,
      migratedRecords: 0,
      errors: 0,
      startTime: new Date()
    };

    try {
      const carbonRepository = this.postgresService.getDataSource().getRepository('CarbonFootprint');
      const totalFootprints = await carbonRepository.count();
      stats.totalRecords = totalFootprints;

      logger.info(`Starting migration of ${totalFootprints} carbon footprints...`);

      if (options.dryRun) {
        logger.info('[DRY RUN] Would migrate carbon_footprints table');
        stats.migratedRecords = totalFootprints;
        stats.endTime = new Date();
        return stats;
      }

      let offset = 0;
      while (offset < totalFootprints) {
        const footprints = await carbonRepository.find({
          skip: offset,
          take: options.batchSize,
          order: { createdAt: 'ASC' }
        });

        for (const footprint of footprints) {
          try {
            // Transform PostgreSQL carbon footprint to Supabase format
            const supabaseFootprint = {
              id: footprint.id,
              message_id: footprint.messageId,
              emissions: footprint.emissions,
              energy: footprint.energy,
              intensity: footprint.intensity,
              region: footprint.region,
              model_name: footprint.modelName,
              provider: footprint.provider,
              metadata: footprint.metadata,
              created_at: footprint.createdAt.toISOString()
            };

            await this.supabaseService.createCarbonFootprint(supabaseFootprint);
            stats.migratedRecords++;
            
            if (stats.migratedRecords % 500 === 0) {
              logger.info(`Migrated ${stats.migratedRecords}/${totalFootprints} carbon footprints`);
            }
          } catch (error) {
            logger.error(`Error migrating carbon footprint ${footprint.id}:`, error);
            stats.errors++;
          }
        }

        offset += options.batchSize;
      }

      stats.endTime = new Date();
      logger.info(`Carbon footprints migration completed: ${stats.migratedRecords}/${stats.totalRecords} migrated, ${stats.errors} errors`);
      
    } catch (error) {
      logger.error('Error during carbon footprints migration:', error);
      stats.endTime = new Date();
      throw error;
    }

    return stats;
  }

  async migrateAll(options: MigrationOptions): Promise<void> {
    logger.info('Starting full data migration from PostgreSQL to Supabase...');
    
    const migrationOrder = [
      'users',
      'model_info',
      'conversations',
      'messages',
      'carbon_footprints'
    ];

    for (const table of migrationOrder) {
      if (options.table && options.table !== table) {
        continue;
      }

      try {
        let stats: MigrationStats;
        
        switch (table) {
          case 'users':
            stats = await this.migrateUsers(options);
            break;
          case 'model_info':
            stats = await this.migrateModelInfo(options);
            break;
          case 'conversations':
            stats = await this.migrateConversations(options);
            break;
          case 'messages':
            stats = await this.migrateMessages(options);
            break;
          case 'carbon_footprints':
            stats = await this.migrateCarbonFootprints(options);
            break;
          default:
            throw new Error(`Unknown table: ${table}`);
        }

        this.stats.push(stats);
      } catch (error) {
        logger.error(`Failed to migrate table ${table}:`, error);
        throw error;
      }
    }

    this.printMigrationSummary();
  }

  private printMigrationSummary(): void {
    logger.info('\n=== MIGRATION SUMMARY ===');
    
    let totalRecords = 0;
    let totalMigrated = 0;
    let totalErrors = 0;

    for (const stat of this.stats) {
      const duration = stat.endTime ? 
        ((stat.endTime.getTime() - stat.startTime.getTime()) / 1000).toFixed(2) : 
        'N/A';
      
      logger.info(`${stat.table}: ${stat.migratedRecords}/${stat.totalRecords} migrated, ${stat.errors} errors (${duration}s)`);
      
      totalRecords += stat.totalRecords;
      totalMigrated += stat.migratedRecords;
      totalErrors += stat.errors;
    }

    logger.info(`\nTOTAL: ${totalMigrated}/${totalRecords} migrated, ${totalErrors} errors`);
    logger.info('=========================\n');
  }

  async cleanup(): Promise<void> {
    await this.postgresService.close();
    logger.info('Migration completed and connections closed');
  }
}

async function main() {
  const program = new Command();
  
  program
    .name('migrate-data-to-supabase')
    .description('Migrate data from PostgreSQL to Supabase')
    .option('--dry-run', 'Preview the migration without actually transferring data', false)
    .option('--batch-size <size>', 'Number of records to process in each batch', '1000')
    .option('--table <table>', 'Migrate only a specific table')
    .parse();

  const options = program.opts();
  const migrationOptions: MigrationOptions = {
    dryRun: options.dryRun,
    batchSize: parseInt(options.batchSize),
    table: options.table
  };

  const migrator = new DataMigrator();

  try {
    await migrator.initialize();
    await migrator.migrateAll(migrationOptions);
    logger.info('Data migration completed successfully!');
  } catch (error) {
    logger.error('Data migration failed:', error);
    process.exit(1);
  } finally {
    await migrator.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
