import { Router } from 'express';
import { getPlans, getPlanBySlug, getActivePaymentMethods } from '../../controllers/public/planController.js';

const router = Router();

router.get('/plans', getPlans);
router.get('/plans/payment-methods', getActivePaymentMethods);
router.get('/plans/:slug', getPlanBySlug);

export default router;