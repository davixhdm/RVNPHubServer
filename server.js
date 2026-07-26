import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import './scripts/dnsSet.js';
import { createServer } from 'http';
import express from 'express';
import mongoose from 'mongoose';
import logger from './utils/logger.js';

const requiredEnv = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`\n❌ Missing required environment variables: ${missingEnv.join(', ')}\n`);
  process.exit(1);
}

import connectDB from './config/db.js';
import redisClient from './config/redis.js';
import { AGORA_ENABLED } from './config/agora.js';
import { FIREBASE_ENABLED } from './config/firebase.js';
import './config/cloudinary.js';
import './config/hdmBridge.js';
import './config/brevo.js';
import './config/hdmAI.js';
import './config/mpesa.js';
import startKeepAlive from './config/keepAlive.js';

const app = express();

import helmetMiddleware from './middleware/global/helmet.js';
import corsMiddleware from './middleware/global/cors.js';
import compressionMiddleware from './middleware/global/compression.js';
import morganMiddleware from './middleware/global/morgan.js';
import rateLimiter from './middleware/global/rateLimiter.js';
import maintenanceMiddleware from './middleware/global/maintenance.js';
import errorHandler from './middleware/global/errorHandler.js';

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(compressionMiddleware);
app.use(morganMiddleware);
app.use(rateLimiter);
app.use(maintenanceMiddleware);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

import routes from './routes/index.js';
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: `Welcome to ${process.env.APP_NAME || 'RVNP Campus Hub'}`,
    from: process.env.COMPANY_NAME || 'HDM',
    tagline: process.env.APP_TAGLINE || 'The Digital Quad of Rift Valley National Polytechnic',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    docs: '/health',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: `${process.env.APP_NAME || 'RVNP Campus Hub'} is running`,
    from: process.env.COMPANY_NAME || 'HDM',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    server: {
      uptime: Math.floor(process.uptime()),
      memoryMB: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
    },
    features: {
      redis: process.env.REDIS_ENABLED === 'true',
      agora: AGORA_ENABLED,
      firebase: FIREBASE_ENABLED,
    },
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: `${process.env.APP_NAME || 'RVNP Campus Hub'} API`,
    from: process.env.COMPANY_NAME || 'HDM',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      public: { site: '/api/site', plans: '/api/plans', payments: '/api/payments', legal: '/api/legal' },
      admin: '/api/admin',
    },
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errorCode: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

const httpServer = createServer(app);

import { initSocket } from './config/socket.js';
const io = initSocket(httpServer);

import { startAllJobs } from './jobs/index.js';

const PORT = process.env.PORT || 5000;
const APP_NAME = process.env.APP_NAME || 'RVNP Campus Hub';
const APP_TAGLINE = process.env.APP_TAGLINE || 'The Digital Quad of Rift Valley National Polytechnic';
const COMPANY = process.env.COMPANY_NAME || 'HDM';

const printBanner = () => {
  const line = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  console.log('');
  console.log(line);
  console.log(`  ${APP_NAME}`);
  console.log(`  ${APP_TAGLINE}`);
  console.log(`  from ${COMPANY}`);
  console.log(line);
  console.log(`  Environment  : ${process.env.NODE_ENV}`);
  console.log(`  MongoDB      : connected ✓`);
  console.log(`  Redis        : ${process.env.REDIS_ENABLED === 'true' ? 'connected ✓' : 'disabled'}`);
  console.log(`  Firebase     : ${FIREBASE_ENABLED ? 'ready ✓' : 'disabled'}`);
  console.log(`  Agora        : ${AGORA_ENABLED ? 'ready ✓' : 'disabled'}`);
  console.log(`  Cloudinary   : ready ✓`);
  console.log(`  hdmBridge    : ready ✓`);
  console.log(`  Brevo        : ready ✓`);
  console.log(`  HDM AI       : ready ✓`);
  console.log(`  M-Pesa       : ${process.env.MPESA_ENVIRONMENT || 'sandbox'} ✓`);
  console.log(`  Socket.IO    : ready ✓`);
  console.log(`  Cron Jobs    : running ✓`);
  console.log(`  Routes       : loaded ✓`);
  console.log(line);
  console.log(`  API Server   : ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
  console.log(`  Client App   : ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`  Admin Panel  : ${process.env.ADMIN_URL || 'http://localhost:3001'}`);
  console.log(line);
  console.log('');
};

async function bootstrap() {
  try {
    await connectDB();
    logger.info('MongoDB connected successfully');

    if (process.env.REDIS_ENABLED === 'true') {
      try {
        await redisClient.connect();
        logger.info('Redis connected successfully');
      } catch (err) {
        logger.warn('Redis connection failed, running without cache');
      }
    }

    if (FIREBASE_ENABLED) logger.info('Firebase ready');
    if (AGORA_ENABLED) logger.info('Agora ready');

    startAllJobs();
    logger.info('Cron jobs started');

    startKeepAlive();

    httpServer.listen(PORT, () => printBanner());
  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error(`\n❌ Failed to start server: ${error.message}\n`);
    process.exit(1);
  }
}

const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️  ${signal} received. Shutting down gracefully...\n`);
  httpServer.close(() => console.log('✓ HTTP server closed'));
  try { io.close(); console.log('✓ Socket.IO closed'); } catch (err) {}
  try {
    const { stopAllJobs } = await import('./jobs/index.js');
    stopAllJobs();
    console.log('✓ Cron jobs stopped');
  } catch (err) {}
  try {
    await mongoose.connection.close(false);
    console.log('✓ MongoDB connection closed');
  } catch (err) {
    console.log('⚠ MongoDB close error:', err.message);
  }
  if (process.env.REDIS_ENABLED === 'true') {
    try { await redisClient.quit(); console.log('✓ Redis connection closed'); } catch (err) {}
  }
  console.log(`\n✓ ${APP_NAME} shut down successfully\n`);
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error(`\n❌ Unhandled Rejection: ${reason?.message || reason}\n`);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  console.error(`\n❌ Uncaught Exception: ${error.message}\n`);
  console.error(error.stack);
  process.exit(1);
});

bootstrap();

export { app, httpServer, io };