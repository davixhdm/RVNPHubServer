import logger from '../utils/logger.js';

const AGORA_ENABLED = process.env.AGORA_ENABLED === 'true';
const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

let RtcTokenBuilder, RtmTokenBuilder, RtcRole;

if (AGORA_ENABLED) {
  try {
    const agora = await import('agora-access-token');
    RtcTokenBuilder = agora.RtcTokenBuilder;
    RtmTokenBuilder = agora.RtmTokenBuilder;
    RtcRole = agora.RtcRole;
    logger.info('Agora configured');
  } catch (error) {
    logger.error('Agora import failed:', error.message);
    AGORA_ENABLED = false;
  }
}

const generateRTMToken = (uid) => {
  if (!AGORA_ENABLED) {
    return { token: null, disabled: true };
  }
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  const token = RtmTokenBuilder.buildToken(APP_ID, APP_CERTIFICATE, uid, privilegeExpiredTs);
  return { token, disabled: false };
};

const generateRTCToken = (channelName, uid) => {
  if (!AGORA_ENABLED) {
    return { token: null, disabled: true };
  }
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID, APP_CERTIFICATE, channelName, uid,
    RtcRole.PUBLISHER, privilegeExpiredTs
  );
  return { token, disabled: false };
};

if (!AGORA_ENABLED) {
  logger.info('Agora disabled');
}

export { AGORA_ENABLED, APP_ID, generateRTMToken, generateRTCToken };