import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import sanitizeBody from '../../middleware/user/sanitizeBody.js';
import { getPlans, getMySubscription, subscribe, cancelSubscription, getPaymentMethods, getBillingHistory } from '../../controllers/user/subscriptionController.js';

const router = Router();

router.get('/subscriptions/plans', auth(), getPlans);
router.get('/subscriptions/me', auth(), getMySubscription);
router.post('/subscriptions', auth(), sanitizeBody, subscribe);
router.post('/subscriptions/cancel', auth(), cancelSubscription);
router.get('/subscriptions/payment-methods', auth(), getPaymentMethods);
router.get('/subscriptions/billing', auth(), getBillingHistory);

export default router;