import axios from 'axios';
import logger from '../utils/logger.js';

const HDM_BRIDGE_API_KEY = process.env.HDM_BRIDGE_API_KEY;
const HDM_BRIDGE_API_URL = process.env.HDM_BRIDGE_API_URL;
const HDM_BRIDGE_FROM_EMAIL = process.env.HDM_BRIDGE_FROM_EMAIL;
const HDM_BRIDGE_FROM_NAME = process.env.HDM_BRIDGE_FROM_NAME;

const hdmBridgeClient = axios.create({
  baseURL: HDM_BRIDGE_API_URL,
  headers: {
    Authorization: `Bearer ${HDM_BRIDGE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

const sendEmail = async ({ to, subject, htmlBody, textBody }) => {
  try {
    const response = await hdmBridgeClient.post('/emails/send', {
      from: HDM_BRIDGE_FROM_EMAIL,
      fromName: HDM_BRIDGE_FROM_NAME,
      to,
      subject,
      htmlBody,
      textBody: textBody || '',
    });

    logger.info(`Email sent to ${to} — "${subject}"`);
    return { success: true, data: response.data };
  } catch (error) {
    logger.error(`Email failed to ${to}:`, error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

logger.info('hdmBridge configured');
export default sendEmail;