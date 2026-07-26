import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import adminRole from '../../middleware/admin/adminRole.js';
import { getReports, getReportById, resolveReport, dismissReport, getReportStats } from '../../controllers/admin/reportController.js';

const router = Router();

router.get('/reports', adminAuth, getReports);
router.get('/reports/:id', adminAuth, getReportById);
router.post('/reports/:id/resolve', adminAuth, adminRole('super_admin', 'moderator'), resolveReport);
router.post('/reports/:id/dismiss', adminAuth, adminRole('super_admin', 'moderator'), dismissReport);
router.get('/reports/stats', adminAuth, getReportStats);

export default router;