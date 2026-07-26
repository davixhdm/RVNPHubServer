import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import validateObjectId from '../../middleware/user/validateObjectId.js';
import { getMyBadges, getBadgeById, getBadgeProgress } from '../../controllers/user/badgeController.js';

const router = Router();

router.get('/badges', auth(), getMyBadges);
router.get('/badges/progress', auth(), getBadgeProgress);
router.get('/badges/:id', auth(), validateObjectId('id'), getBadgeById);

export default router;