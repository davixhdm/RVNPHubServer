import { Router } from 'express';
import adminAuthRoutes from './adminAuthRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import healthRoutes from './healthRoutes.js';
import userManagementRoutes from './userManagementRoutes.js';
import moderationRoutes from './moderationRoutes.js';
import spotlightRoutes from './spotlightRoutes.js';
import supportRoutes from './supportRoutes.js';
import reportRoutes from './reportRoutes.js';
import announcementRoutes from './announcementRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import planRoutes from './planRoutes.js';
import paymentMethodRoutes from './paymentMethodRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import backupRoutes from './backupRoutes.js';
import jobRoutes from './jobRoutes.js';

const router = Router();

router.use('/auth', adminAuthRoutes);
router.use(dashboardRoutes);
router.use(healthRoutes);
router.use(userManagementRoutes);
router.use(moderationRoutes);
router.use(spotlightRoutes);
router.use(supportRoutes);
router.use(reportRoutes);
router.use(announcementRoutes);
router.use(analyticsRoutes);
router.use(paymentRoutes);
router.use(planRoutes);
router.use(paymentMethodRoutes);
router.use(settingsRoutes);
router.use(backupRoutes);
router.use(jobRoutes);

export default router;