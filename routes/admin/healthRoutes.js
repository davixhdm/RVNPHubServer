import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import adminRole from '../../middleware/admin/adminRole.js';
import { getHealth } from '../../controllers/admin/healthController.js';

const router = Router();

router.get('/health', adminAuth, adminRole('super_admin'), getHealth);

export default router;