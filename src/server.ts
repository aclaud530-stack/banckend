import 'express-async-errors';
import express, { Application } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from '@config/index.js';
import logger from '@utils/logger.js';
import { initRedis, closeRedis, isRedisConnected } from '@utils/redis.js';
import { destroyMemoryStore } from '@utils/memory-store.js';
import {
  helmetMiddleware,
  corsMiddleware,
  sanitizationMiddleware,
  urlEncodedMiddleware,
  requestLoggerMiddleware,
  apiLimiter,
} from '@middleware/security.js';
import {
  errorHandler,
  notFoundHandler,
} from '@middleware/errorHandler.js';
import authRoutes from '@routes/auth.routes.js';
import accountRoutes from '@routes/accounts.routes.js';
import tradingRoutes from '@routes/trading.routes.js';

// Initialize Express app
const app: Application = express();
const server = http.createServer(app);

// Initialize WebSocket server — usa WebSocketServer em vez de WebSocket.Server
const wss = new WebSocketServer({ server });

// WebSocket connection handling
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  logger.info('WebSocket client connected', { ip: req.socket.remoteAddress });

  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, config.websocket.heartbeatInterval);

  ws.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      ws.send(JSON.stringify({ echo: data }));
    } catch (error) {
      logger.error('WebSocket message error', { error });
      ws.send(JSON.stringify({ error: 'Invalid message' }));
    }
  });

  ws.on('pong', () => {
    // Client is alive
  });

  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
    clearInterval(pingInterval);
  });

  ws.on('error', (error: Error) => {
    logger.error('WebSocket error', { error });
    clearInterval(pingInterval);
  });
});

// ============================================
// Security Middleware
// ============================================
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(sanitizationMiddleware);
app.use(urlEncodedMiddleware);

// ============================================
// Request Logging & Rate Limiting
// ============================================
app.use(requestLoggerMiddleware);
app.use(apiLimiter);

// ============================================
// Health Check Endpoint
// ============================================
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    redis: isRedisConnected() ? 'connected' : 'unavailable (using memory)',
    uptime: process.uptime(),
  });
});

// ============================================
// API Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/trading', tradingRoutes);

// ============================================
// 404 Handler
// ============================================
app.use(notFoundHandler);

// ============================================
// Global Error Handler
// ============================================
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================
const startServer = async () => {
  try {
    logger.info('Initializing data store...');
    await initRedis();
    logger.info(`Data store ready (Redis: ${isRedisConnected() ? 'connected' : 'unavailable'})`);

    server.listen(config.server.port, config.server.host, () => {
      logger.info('Server started successfully', {
        host: config.server.host,
        port: config.server.port,
        environment: config.server.nodeEnv,
        redis: isRedisConnected() ? 'connected' : 'memory fallback',
        timestamp: new Date().toISOString(),
      });

      if (config.server.isDevelopment) {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║         Deriv Trading Backend Server Started               ║
║                                                            ║
║  🚀 API:      http://${config.server.host}:${config.server.port}                      ║
║  📚 Health:   http://${config.server.host}:${config.server.port}/health               ║
║  🔐 Auth:     http://${config.server.host}:${config.server.port}/api/auth             ║
║  💼 Accounts: http://${config.server.host}:${config.server.port}/api/accounts         ║
║  📈 Trading:  http://${config.server.host}:${config.server.port}/api/trading          ║
║                                                            ║
║  Environment: ${config.server.nodeEnv.toUpperCase()}                                  ║
║  Redis: ${isRedisConnected() ? 'CONNECTED        ' : 'MEMORY FALLBACK  '}             ║
╚════════════════════════════════════════════════════════════╝
        `);
      }
    });
  } catch (error) {
    logger.error('Failed to start server', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
};

// ============================================
// Graceful Shutdown
// ============================================
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  wss.close(() => {
    logger.info('WebSocket server closed');
  });

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await closeRedis();
    } catch (error) {
      logger.error('Error closing Redis', { error });
    }

    destroyMemoryStore();
    logger.info('Memory store cleaned up');

    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise: promise.toString(),
  });
});

startServer();

export default app;
