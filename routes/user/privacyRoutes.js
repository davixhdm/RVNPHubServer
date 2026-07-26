import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import validateObjectId from '../../middleware/user/validateObjectId.js';
import sanitizeBody from '../../middleware/user/sanitizeBody.js';
import { getPrivacySettings, updatePrivacySettings, blockUser, unblockUser, getBlockedUsers } from '../../controllers/user/privacyController.js';

const router = Router();

router.get('/privacy', auth(), getPrivacySettings);
router.patch('/privacy', auth(), sanitizeBody, updatePrivacySettings);
router.post('/privacy/block/:userId', auth(), validateObjectId('userId'), blockUser);
router.post('/privacy/unblock/:userId', auth(), validateObjectId('userId'), unblockUser);
router.get('/privacy/blocked', auth(), getBlockedUsers);

export default router;