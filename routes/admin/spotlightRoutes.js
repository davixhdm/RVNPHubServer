import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import adminRole from '../../middleware/admin/adminRole.js';
import { getSpotlights, featurePost, removeSpotlight, extendSpotlight, getSpotlightHistory, getSpotlightQueue } from '../../controllers/admin/spotlightController.js';

const router = Router();

router.get('/spotlight', adminAuth, getSpotlights);
router.post('/spotlight/:id', adminAuth, adminRole('super_admin', 'moderator'), featurePost);
router.delete('/spotlight/:id', adminAuth, adminRole('super_admin', 'moderator'), removeSpotlight);
router.patch('/spotlight/:id/extend', adminAuth, adminRole('super_admin', 'moderator'), extendSpotlight);
router.get('/spotlight/history', adminAuth, getSpotlightHistory);
router.get('/spotlight/queue', adminAuth, adminRole('super_admin', 'moderator'), getSpotlightQueue);

export default router;