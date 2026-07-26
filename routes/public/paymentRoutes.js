import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import { initiateMpesaPayment, mpesaCallback, verifyTransaction, getPaymentHistory } from '../../controllers/public/paymentController.js';

const router = Router();

router.post('/payments/mpesa/initiate', auth(), initiateMpesaPayment);
router.post('/payments/mpesa/callback', mpesaCallback);
router.get('/payments/verify/:transactionId', auth(), verifyTransaction);
router.get('/payments/history', auth(), getPaymentHistory);

export default router;