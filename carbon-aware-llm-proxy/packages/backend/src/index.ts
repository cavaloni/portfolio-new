import 'dotenv/config';
import 'reflect-metadata';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { rateLimiterMiddleware } from './middleware/rateLimiter';
import { healthCheckRouter } from './routes/healthCheck';
import { v1Router } from './routes/v1';
import { databaseService } from './services/database.service';
import { webSocketService } from './services/websocket.service';
import { redisService } from './services/redis.service';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Apply rate limiting middleware
app.use(rateLimiterMiddleware);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use('/health', healthCheckRouter);
app.use('/v1', v1Router);

// 404 handler
app.use(notFoundHandler);

// Error handler - must be last middleware
app.use(errorHandler);

// Start server
const server = createServer(app);

const startServer = async () => {
  try {
    // Initialize database connection
    await databaseService.initialize();
    
    // Initialize Redis connection
    await redisService.connect();
    
    // Run pending migrations
    if (process.env.NODE_ENV !== 'test') {
      await databaseService.runMigrations();
    }
    
    // Start the HTTP server
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Initialize WebSocket service after server is listening
    webSocketService.initialize(server);
    
    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down server...');
      
      // Close WebSocket service
      webSocketService.shutdown();
      
      // Close Redis connection
      await redisService.disconnect();
      
      // Close HTTP server
      server.close(async () => {
        // Close database connection
        await databaseService.close();
        logger.info('Server has been shut down');
        process.exit(0);
      });
      
      // Force close after 5 seconds
      setTimeout(() => {
        logger.error('Forcing server shutdown');
        process.exit(1);
      }, 5000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    await databaseService.close().catch(e => logger.error('Error closing database connection:', e));
    await redisService.disconnect().catch(e => logger.error('Error closing Redis connection:', e));
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Consider restarting the server or performing cleanup
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('=== UNCAUGHT EXCEPTION ===');
  logger.error('Error:', error);
  logger.error('Error name:', error?.name || 'Unknown');
  logger.error('Error message:', error?.message || 'No message');
  logger.error('Error stack:', error?.stack || 'No stack trace');
  logger.error('Error cause:', error?.cause || 'No cause');
  logger.error('=======================');
  process.exit(1);
});

export { app };
