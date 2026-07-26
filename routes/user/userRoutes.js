import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import { uploadAvatar as uploadAvatarMiddleware, uploadGroupCover } from '../../middleware/user/upload.js';
import validateObjectId from '../../middleware/user/validateObjectId.js';
import sanitizeBody from '../../middleware/user/sanitizeBody.js';
import {
  getProfile, getMyProfile, updateProfile, uploadAvatar, uploadCover, removeCover,
  deleteAccount, updateSettings, getUserBadges, getUserPosts, getUserListings,
  applyVerification, checkVerificationStatus, updateFirebaseToken, toggleOnline,
} from '../../controllers/user/userController.js';

const router = Router();

router.get('/users/me', auth(), getMyProfile);
router.patch('/users/me', auth(), sanitizeBody, updateProfile);
router.post('/users/me/avatar', auth(), uploadAvatarMiddleware, uploadAvatar);
router.post('/users/me/cover', auth(), uploadGroupCover, uploadCover);
router.delete('/users/me/cover', auth(), removeCover);
router.delete('/users/me', auth(), deleteAccount);
router.patch('/users/me/settings', auth(), updateSettings);
router.get('/users/me/verification-status', auth(), checkVerificationStatus);
router.post('/users/me/verify', auth(), applyVerification);
router.patch('/users/me/firebase-token', auth(), updateFirebaseToken);
router.post('/users/me/online', auth(), toggleOnline);
router.get('/users/:id', auth({ optional: true }), validateObjectId('id'), getProfile);
router.get('/users/:id/badges', validateObjectId('id'), getUserBadges);
router.get('/users/:id/posts', validateObjectId('id'), getUserPosts);
router.get('/users/:id/listings', validateObjectId('id'), getUserListings);

export default router;