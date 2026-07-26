import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import { login, logout, refreshToken, getMe, updateProfile, changePassword } from '../../controllers/admin/adminAuthController.js';

const router = Router();

router.post('/login', login);
router.post('/logout', adminAuth, logout);
router.post('/refresh', refreshToken);
router.get('/me', adminAuth, getMe);
router.patch('/profile', adminAuth, updateProfile);
router.patch('/password', adminAuth, changePassword);

export default router;