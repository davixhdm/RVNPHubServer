import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import adminRole from '../../middleware/admin/adminRole.js';
import { getJobStatus, triggerJob, restartJobRoute, stopJobRoute } from '../../controllers/admin/jobController.js';

const router = Router();

router.get('/jobs/status', adminAuth, adminRole('super_admin'), getJobStatus);
router.post('/jobs/trigger/:jobName', adminAuth, adminRole('super_admin'), triggerJob);
router.post('/jobs/restart/:jobName', adminAuth, adminRole('super_admin'), restartJobRoute);
router.post('/jobs/stop/:jobName', adminAuth, adminRole('super_admin'), stopJobRoute);

export default router;