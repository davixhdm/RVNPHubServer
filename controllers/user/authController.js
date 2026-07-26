import User from '../../models/user/User.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/generateToken.js';
import { verifyAccessToken, verifyRefreshToken } from '../../utils/verifyToken.js';
import * as emailService from '../../services/emailService.js';
import * as smsService from '../../services/smsService.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import getSettings from '../../utils/getSettings.js';
import logger from '../../utils/logger.js';

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.userRegistration) throw new AppError('Registration is currently closed', 403, 'REGISTRATION_CLOSED');

    const { email, password, firstName, lastName, department, campus } = req.body;
    if (!email || !password || !firstName || !lastName) throw new AppError('All fields are required', 400, 'MISSING_FIELDS');

    const existing = await User.findOne({ email });
    if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');

    const user = await User.create({ email, password, firstName, lastName, department, campus });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    await emailService.sendWelcomeEmail(user);

    return created(res, { user: user.toJSON(), accessToken, refreshToken }, 'Account created');
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError('Email and password required', 400, 'MISSING_FIELDS');

    const user = await User.findOne({ email });
    if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    if (user.isBanned) throw new AppError('Account banned', 403, 'ACCOUNT_BANNED');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    user.lastSeen = new Date();
    await user.save();

    return success(res, { user: user.toJSON(), accessToken, refreshToken }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-email (PUBLIC)
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) throw new AppError('Verification token required', 400, 'MISSING_TOKEN');

    const { valid, decoded } = verifyAccessToken(token);
    if (!valid) throw new AppError('Invalid or expired verification link. Please request a new one.', 400, 'INVALID_TOKEN');

    const user = await User.findById(decoded.userId);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    if (user.emailVerified) throw new AppError('Email already verified', 400, 'ALREADY_VERIFIED');

    user.emailVerified = true;
    await user.save();

    return success(res, null, 'Email verified successfully. You can now login.');
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/resend-verification
const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    if (user.emailVerified) throw new AppError('Email already verified', 400, 'ALREADY_VERIFIED');

    const verificationToken = generateAccessToken(user._id);
    const verificationLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

    await emailService.sendVerificationCodeEmail(user, verificationLink);

    return success(res, null, 'Verification email sent');
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return success(res, null, 'If email exists, reset link sent');

    const resetToken = generateAccessToken(user._id);
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    await emailService.sendPasswordResetEmail(user, resetLink);

    return success(res, null, 'If email exists, reset link sent');
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password (PUBLIC)
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) throw new AppError('Token and password required', 400, 'MISSING_FIELDS');

    const { valid, decoded } = verifyAccessToken(token);
    if (!valid) throw new AppError('Invalid or expired reset link', 400, 'INVALID_TOKEN');

    const user = await User.findById(decoded.userId);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    user.password = password;
    user.refreshToken = null;
    await user.save();

    await emailService.sendPasswordChangedEmail(user);
    return success(res, null, 'Password reset successful. You can now login.');
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/refresh-token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) throw new AppError('Refresh token required', 400, 'MISSING_TOKEN');

    const { valid, decoded } = verifyRefreshToken(token);
    if (!valid) throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');

    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== token) throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save();

    return success(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) { user.refreshToken = null; await user.save(); }
    return success(res, null, 'Logged out');
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -refreshToken -firebaseToken')
      .populate('activeSubscription');
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    return success(res, { user: user.toJSON() }, 'Current user');
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-phone
const verifyPhone = async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    const user = await User.findById(req.user._id);
    user.phone = phone;
    user.phoneVerified = true;
    await user.save();
    return success(res, null, 'Phone verified');
  } catch (error) {
    next(error);
  }
};

export { register, login, verifyEmail, resendVerification, forgotPassword, resetPassword, refreshToken, logout, verifyPhone, getMe };