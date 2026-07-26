import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import adminRole from '../../middleware/admin/adminRole.js';
import { getOverview, getContentAnalytics, getCommunityAnalytics, getDepartmentAnalytics, getRevenueAnalytics } from '../../controllers/admin/analyticsController.js';

const router = Router();

router.get('/analytics/overview', adminAuth, adminRole('super_admin', 'analyst'), getOverview);
router.get('/analytics/content', adminAuth, adminRole('super_admin', 'analyst'), getContentAnalytics);
router.get('/analytics/community', adminAuth, adminRole('super_admin', 'analyst'), getCommunityAnalytics);
router.get('/analytics/departments', adminAuth, adminRole('super_admin', 'analyst'), getDepartmentAnalytics);
router.get('/analytics/revenue', adminAuth, adminRole('super_admin', 'analyst'), getRevenueAnalytics);

export default router;