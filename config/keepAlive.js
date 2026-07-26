import https from 'https';
import http from 'http';
import logger from '../utils/logger.js';

const startKeepAlive = () => {
  const BASE_URL = process.env.BASE_URL;
  if (!BASE_URL) return;

  const INTERVAL = 10 * 60 * 1000;
  const INITIAL = 1 * 60 * 1000;

  const ping = () => {
    const client = BASE_URL.startsWith('https') ? https : http;
    client.get(`${BASE_URL}/health`, (res) => {
      if (res.statusCode === 200) {
        logger.info(`Keepalive ping OK`);
      }
      res.resume();
    }).on('error', (err) => {
      logger.warn(`Keepalive ping failed: ${err.message}`);
    });
  };

  setTimeout(() => {
    ping();
    setInterval(ping, INTERVAL);
    logger.info(`Keepalive started — ${BASE_URL}/health every ${INTERVAL / 60000}min`);
  }, INITIAL);
};

export default startKeepAlive;