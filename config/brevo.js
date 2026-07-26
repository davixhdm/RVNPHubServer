import axios from 'axios';
import logger from '../utils/logger.js';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_ID = process.env.BREVO_SENDER_ID;
const BREVO_API_URL = 'https://api.brevo.com/v3';

const brevoClient = axios.create({
  baseURL: BREVO_API_URL,
  headers: {
    'api-key': BREVO_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const sendSMS = async ({ phone, body }) => {
  try {
    const response = await brevoClient.post('/transactionalSMS/sms', {
      sender: BREVO_SENDER_ID,
      recipient: phone,
      content: body,
    });

    logger.info(`SMS sent to ${phone}`);
    return { success: true, data: response.data };
  } catch (error) {
    logger.error(`SMS failed to ${phone}:`, error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

logger.info('Brevo configured');
export default sendSMS;