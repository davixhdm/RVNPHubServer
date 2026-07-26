import { createClient } from 'redis';
import logger from '../utils/logger.js';

const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

const mockClient = {
  isReady: false,
  get: async () => null,
  set: async () => { logger.warn('Redis disabled — set() called but ignored'); return 'OK'; },
  del: async () => { logger.warn('Redis disabled — del() called but ignored'); return 0; },
  exists: async () => 0,
  expire: async () => 0,
  quit: async () => {},
  connect: async () => {},
  on: () => {},
};

let redisClient;

if (REDIS_ENABLED) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD || undefined,
  });

  redisClient.on('error', (err) => {
    logger.error('Redis error:', err);
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected');
  });

  redisClient.on('ready', () => {
    logger.info('Redis ready');
  });
} else {
  redisClient = mockClient;
  logger.info('Redis disabled — using mock client');
}

export default redisClient;