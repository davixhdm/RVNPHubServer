import { Router } from 'express';
import siteRoutes from './siteRoutes.js';
import planRoutes from './planRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import legalRoutes from './legalRoutes.js';

const router = Router();

router.use(siteRoutes);
router.use(planRoutes);
router.use(paymentRoutes);
router.use(legalRoutes);

export default router;