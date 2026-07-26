import mongoose from 'mongoose';
import os from 'os';
import redisClient from '../../config/redis.js';
import { AGORA_ENABLED } from '../../config/agora.js';
import { FIREBASE_ENABLED, messaging } from '../../config/firebase.js';
import cloudinary from '../../config/cloudinary.js';
import sendEmail from '../../config/hdmBridge.js';
import sendSMS from '../../config/brevo.js';
import { success } from '../../utils/responseHandler.js';
import logger from '../../utils/logger.js';

const formatUptime = (seconds) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
};

// GET /api/admin/health
const getHealth = async (req, res, next) => {
  try {
    const startTime = Date.now();

    // ============================================
    // Server Status
    // ============================================
    const serverStatus = {
      status: 'running',
      uptime: Math.floor(process.uptime()),
      uptimeFormatted: formatUptime(process.uptime()),
      memory: {
        heapUsedMB: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
        heapTotalMB: Math.round(process.memoryUsage().heapTotal / (1024 * 1024)),
        rssMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        externalMB: Math.round(process.memoryUsage().external / (1024 * 1024)),
      },
      cpu: {
        loadAvg1m: os.loadavg()[0].toFixed(2),
        loadAvg5m: os.loadavg()[1].toFixed(2),
        loadAvg15m: os.loadavg()[2].toFixed(2),
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
      },
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      pid: process.pid,
      environment: process.env.NODE_ENV,
    };

    // ============================================
    // Database Status
    // ============================================
    let dbStatus;
    try {
      const dbStart = Date.now();
      await mongoose.connection.db.admin().ping();
      const dbPing = Date.now() - dbStart;

      const collections = await mongoose.connection.db.listCollections().toArray();
      const dbStats = await mongoose.connection.db.stats();

      dbStatus = {
        status: 'connected',
        host: mongoose.connection.host,
        name: mongoose.connection.db.databaseName,
        ping: `${dbPing}ms`,
        collections: collections.length,
        dataSizeMB: Math.round(dbStats.dataSize / (1024 * 1024)),
        storageSizeMB: Math.round(dbStats.storageSize / (1024 * 1024)),
        indexes: dbStats.indexes,
        avgDocumentSize: Math.round(dbStats.avgObjSize),
      };
    } catch (error) {
      dbStatus = {
        status: 'disconnected',
        error: error.message,
      };
    }

    // ============================================
    // Redis Status
    // ============================================
    let redisStatus;
    if (process.env.REDIS_ENABLED === 'true') {
      try {
        const redisStart = Date.now();
        await redisClient.ping();
        const redisPing = Date.now() - redisStart;
        redisStatus = {
          enabled: true,
          status: 'connected',
          ping: `${redisPing}ms`,
        };
      } catch (error) {
        redisStatus = {
          enabled: true,
          status: 'disconnected',
          error: error.message,
        };
      }
    } else {
      redisStatus = { enabled: false, status: 'disabled' };
    }

    // ============================================
    // Cloudinary Status
    // ============================================
    let cloudinaryStatus;
    try {
      const cloudStart = Date.now();
      const usage = await cloudinary.api.usage();
      const cloudPing = Date.now() - cloudStart;
      cloudinaryStatus = {
        status: 'connected',
        ping: `${cloudPing}ms`,
        plan: usage.plan,
        usedMB: Math.round(usage.credits?.usage || 0),
        limitMB: Math.round(usage.credits?.limit || 0),
        usedPercent: usage.credits?.used_percent || 0,
      };
    } catch (error) {
      cloudinaryStatus = {
        status: 'disconnected',
        error: error.message,
      };
    }

    // ============================================
    // Agora Status
    // ============================================
    const agoraStatus = {
      enabled: AGORA_ENABLED,
      status: AGORA_ENABLED ? 'configured' : 'disabled',
    };

    // ============================================
    // Firebase Status
    // ============================================
    let firebaseStatus;
    if (FIREBASE_ENABLED) {
      try {
        firebaseStatus = {
          enabled: true,
          status: 'configured',
          projectId: process.env.FIREBASE_PROJECT_ID,
        };
      } catch (error) {
        firebaseStatus = {
          enabled: true,
          status: 'error',
          error: error.message,
        };
      }
    } else {
      firebaseStatus = { enabled: false, status: 'disabled' };
    }

    // ============================================
    // hdmBridge Status
    // ============================================
    const hdmBridgeStatus = {
      status: 'configured',
      fromEmail: process.env.HDM_BRIDGE_FROM_EMAIL || 'not set',
    };

    // ============================================
    // Brevo Status
    // ============================================
    const brevoStatus = {
      status: 'configured',
      senderId: process.env.BREVO_SENDER_ID || 'HDM',
    };

    // ============================================
    // HDM AI Status
    // ============================================
    const hdmAIStatus = {
      status: 'configured',
      apiUrl: process.env.HDM_AI_API_URL || 'not set',
    };

    // ============================================
    // M-Pesa Status
    // ============================================
    const mpesaStatus = {
      status: 'configured',
      environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
      shortcode: process.env.MPESA_SHORTCODE || 'not set',
    };

    // ============================================
    // Socket.IO Status
    // ============================================
    let socketStatus;
    try {
      const { getIO } = await import('../../config/socket.js');
      const io = getIO();
      const sockets = await io.fetchSockets();
      socketStatus = {
        status: 'running',
        connectedClients: sockets.length,
      };
    } catch (error) {
      socketStatus = {
        status: 'error',
        error: error.message,
      };
    }

    // ============================================
    // Jobs Status
    // ============================================
    let jobsStatus;
    try {
      const { getJobStatuses } = await import('../../jobs/index.js');
      const statuses = getJobStatuses();
      const totalJobs = Object.keys(statuses).length;
      const runningJobs = Object.values(statuses).filter(j => j.running).length;
      const failedJobs = Object.values(statuses).filter(j => j.lastStatus === 'failed').length;
      jobsStatus = {
        total: totalJobs,
        running: runningJobs,
        failed: failedJobs,
        details: statuses,
      };
    } catch (error) {
      jobsStatus = { status: 'error', error: error.message };
    }

    // ============================================
    // Response
    // ============================================
    const totalPing = Date.now() - startTime;

    return success(res, {
      timestamp: new Date().toISOString(),
      responseTime: `${totalPing}ms`,
      server: serverStatus,
      database: dbStatus,
      redis: redisStatus,
      cloudinary: cloudinaryStatus,
      agora: agoraStatus,
      firebase: firebaseStatus,
      hdmBridge: hdmBridgeStatus,
      brevo: brevoStatus,
      hdmAI: hdmAIStatus,
      mpesa: mpesaStatus,
      socketIO: socketStatus,
      jobs: jobsStatus,
    }, 'System health report');
  } catch (error) {
    logger.error('Health check failed:', error);
    next(error);
  }
};

export { getHealth };