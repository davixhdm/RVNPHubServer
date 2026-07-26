import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import adminRole from '../../middleware/admin/adminRole.js';
import { getModerationQueue, approveContent, removeContent, warnUser, getModerationHistory } from '../../controllers/admin/moderationController.js';

const router = Router();

router.get('/moderation/queue', adminAuth, adminRole('super_admin', 'moderator'), getModerationQueue);
router.post('/moderation/:id/approve', adminAuth, adminRole('super_admin', 'moderator'), approveContent);
router.post('/moderation/:id/remove', adminAuth, adminRole('super_admin', 'moderator'), removeContent);
router.post('/moderation/:id/warn', adminAuth, adminRole('super_admin', 'moderator'), warnUser);
router.get('/moderation/history', adminAuth, adminRole('super_admin', 'moderator'), getModerationHistory);

export default router;