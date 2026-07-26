import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import { getStats, getQuickStats, getUserGrowth, getContentActivity } from '../../controllers/admin/dashboardController.js';

const router = Router();

router.get('/stats', adminAuth, getStats);
router.get('/stats/quick', adminAuth, getQuickStats);
router.get('/stats/user-growth', adminAuth, getUserGrowth);
router.get('/stats/content-activity', adminAuth, getContentActivity);

export default router;