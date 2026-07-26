import admin from 'firebase-admin';
import logger from '../utils/logger.js';

let FIREBASE_ENABLED = process.env.FIREBASE_ENABLED === 'true';

let messaging;

if (FIREBASE_ENABLED) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    messaging = admin.messaging();
    logger.info('Firebase initialized');
  } catch (error) {
    logger.error('Firebase initialization failed:', error.message);
    FIREBASE_ENABLED = false;
  }
}

if (!FIREBASE_ENABLED) {
  messaging = {
    send: async () => {
      logger.warn('Firebase disabled — push not sent');
      return { success: false, reason: 'firebase_disabled' };
    },
    sendMulticast: async () => {
      logger.warn('Firebase disabled — push not sent');
      return { success: false, reason: 'firebase_disabled' };
    },
  };
  logger.info('Firebase disabled');
}

export { FIREBASE_ENABLED, messaging };
export default admin;