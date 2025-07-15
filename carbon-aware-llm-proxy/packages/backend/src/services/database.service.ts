import { DataSource } from 'typeorm';
import { dbConfig } from '../config/database';
import { logger } from '../utils/logger';

export class DatabaseService {
  private static instance: DatabaseService;
  private dataSource: DataSource;
  private isInitialized = false;

  private constructor() {
    this.dataSource = new DataSource(dbConfig);
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.dataSource.initialize();
      this.isInitialized = true;
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Failed to connect to the database:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.isInitialized = false;
      logger.info('Database connection closed');
    }
  }

  public getDataSource(): DataSource {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.dataSource;
  }

  public async runMigrations(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      const pendingMigrations = await this.dataSource.showMigrations();
      if (pendingMigrations) {
        logger.info('Running database migrations...');
        await this.dataSource.runMigrations({ transaction: 'all' });
        logger.info('Database migrations completed successfully');
      } else {
        logger.info('No pending migrations');
      }
    } catch (error) {
      logger.error('Error running migrations:', error);
      throw error;
    }
  }

  public async dropDatabase(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Dropping database is only allowed in test environment');
    }
    
    if (this.dataSource.isInitialized) {
      await this.dataSource.dropDatabase();
      logger.warn('Database dropped');
    }
  }

  public async clearDatabase(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Clearing database is only allowed in test environment');
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    const entities = this.dataSource.entityMetadatas;
    const tableNames = entities
      .map((entity) => `"${entity.tableName}"`)
      .join(', ');

    if (tableNames) {
      await this.dataSource.query(`TRUNCATE ${tableNames} CASCADE;`);
      logger.warn('Database cleared');
    }
  }
}

export const databaseService = DatabaseService.getInstance();
