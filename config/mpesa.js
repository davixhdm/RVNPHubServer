import axios from 'axios';
import logger from '../utils/logger.js';

const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY;
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE;
const MPESA_ENVIRONMENT = process.env.MPESA_ENVIRONMENT;

const BASE_URL = MPESA_ENVIRONMENT === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

let accessToken = null;
let tokenExpiry = null;

const getAccessToken = async () => {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    const response = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + 3500 * 1000; // 58 minutes
    logger.info('M-Pesa access token generated');
    return accessToken;
  } catch (error) {
    logger.error('M-Pesa auth error:', error.response?.data || error.message);
    throw error;
  }
};

const stkPush = async ({ phone, amount, accountReference, transactionDesc }) => {
  try {
    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

    const response = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: `${process.env.CLIENT_URL}/api/payments/mpesa/callback`,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    logger.info(`M-Pesa STK Push sent to ${phone} for KSh ${amount}`);
    return { success: true, data: response.data };
  } catch (error) {
    logger.error('M-Pesa STK Push error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

const queryTransaction = async (checkoutRequestID) => {
  try {
    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

    const response = await axios.post(
      `${BASE_URL}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return { success: true, data: response.data };
  } catch (error) {
    logger.error('M-Pesa query error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

logger.info(`M-Pesa configured — ${MPESA_ENVIRONMENT}`);
export { getAccessToken, stkPush, queryTransaction };