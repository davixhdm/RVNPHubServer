import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import adminRole from '../../middleware/admin/adminRole.js';
import { getPlans, getPlanById, createPlan, updatePlan, deletePlan, togglePlan } from '../../controllers/admin/planController.js';

const router = Router();

router.get('/plans', adminAuth, getPlans);
router.get('/plans/:id', adminAuth, getPlanById);
router.post('/plans', adminAuth, adminRole('super_admin'), createPlan);
router.patch('/plans/:id', adminAuth, adminRole('super_admin'), updatePlan);
router.delete('/plans/:id', adminAuth, adminRole('super_admin'), deletePlan);
router.post('/plans/:id/toggle', adminAuth, adminRole('super_admin'), togglePlan);

export default router;