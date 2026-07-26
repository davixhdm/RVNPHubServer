import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import sanitizeBody from '../../middleware/user/sanitizeBody.js';
import {
  register, login, verifyEmail, resendVerification, forgotPassword,
  resetPassword, refreshToken, logout, verifyPhone, getMe,
} from '../../controllers/user/authController.js';

const router = Router();

// Public
router.post('/register', sanitizeBody, register);
router.post('/login', sanitizeBody, login);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', sanitizeBody, forgotPassword);
router.post('/reset-password', sanitizeBody, resetPassword);
router.post('/refresh-token', refreshToken);

// Authenticated
router.get('/me', auth(), getMe);
router.post('/resend-verification', auth(), resendVerification);
router.post('/logout', auth(), logout);
router.post('/verify-phone', auth(), verifyPhone);

export default router;