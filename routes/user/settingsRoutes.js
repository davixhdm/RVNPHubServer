import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import sanitizeBody from '../../middleware/user/sanitizeBody.js';
import { getAccountSettings, updateAccountSettings, changePassword, updateNotificationSettings, updateTheme, deactivateAccount } from '../../controllers/user/settingsController.js';

const router = Router();

router.get('/settings/account', auth(), getAccountSettings);
router.patch('/settings/account', auth(), sanitizeBody, updateAccountSettings);
router.patch('/settings/password', auth(), sanitizeBody, changePassword);
router.patch('/settings/notifications', auth(), updateNotificationSettings);
router.patch('/settings/theme', auth(), updateTheme);
router.delete('/settings/deactivate', auth(), deactivateAccount);

export default router;