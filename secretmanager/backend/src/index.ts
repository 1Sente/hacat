import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './api/auth';
import requestsRoutes from './api/requests';
import secretsRoutes from './api/secrets';
import analyticsRoutes from './api/analytics';

// Import services
import WebSocketService from './services/websocket';
import { openBaoService } from './services/openbao';
import { keycloakService } from './services/keycloak';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const prisma = new PrismaClient();

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);

// Set WebSocket service for routes that need it
import { setWebSocketService as setRequestsWebSocketService } from './api/requests';
import { setWebSocketService as setSecretsWebSocketService } from './api/secrets';
setRequestsWebSocketService(webSocketService);
setSecretsWebSocketService(webSocketService);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: [
    process.env.FRONTEND_CLIENT_URL || 'http://localhost:3000',
    process.env.FRONTEND_ADMIN_URL || 'http://localhost:3001'
  ],
  credentials: true
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check OpenBao connection
    const openBaoHealthy = await openBaoService.healthCheck();
    
    // Check Keycloak connection
    const keycloakHealthy = await keycloakService.healthCheck();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        openBao: openBaoHealthy ? 'healthy' : 'unhealthy',
        keycloak: keycloakHealthy ? 'healthy' : 'unhealthy'
      },
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/secrets', secretsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Secret Manager API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      requests: '/api/requests',
      secrets: '/api/secrets',
      analytics: '/api/analytics',
      health: '/health'
    },
    documentation: 'See README.md for API documentation'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    try {
      await prisma.$disconnect();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  });
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(Number(PORT), HOST, async () => {
  console.log(`🚀 Secret Manager API server running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check available at http://${HOST}:${PORT}/health`);
  console.log(`🔌 WebSocket server initialized`);
  
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Run Prisma migrations
    console.log('🔄 Running database migrations...');
    // Note: In production, you might want to run migrations separately
    
    // Test external services
    console.log('🔍 Testing external services...');
    
    const openBaoHealthy = await openBaoService.healthCheck();
    console.log(`📦 OpenBao: ${openBaoHealthy ? '✅ Connected' : '❌ Connection failed'}`);
    
    const keycloakHealthy = await keycloakService.healthCheck();
    console.log(`🔑 Keycloak: ${keycloakHealthy ? '✅ Connected' : '❌ Connection failed'}`);
    
    console.log('🎉 Server startup completed successfully!');
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
});

export default app;
