import User from '../../models/user/User.js';
import * as emailService from '../../services/emailService.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import getSettings from '../../utils/getSettings.js';
import logger from '../../utils/logger.js';

// GET /api/settings/account
const getAccountSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('settings email phone emailVerified phoneVerified');
    return success(res, user, 'Account settings');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/settings/account
const updateAccountSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (req.body.email) { user.email = req.body.email; user.emailVerified = false; }
    if (req.body.phone) { user.phone = req.body.phone; user.phoneVerified = false; }
    if (req.body.settings) { user.settings = { ...user.settings.toObject(), ...req.body.settings }; }
    await user.save();
    return success(res, { email: user.email, phone: user.phone, settings: user.settings }, 'Account settings updated');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/settings/password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new AppError('Current password is incorrect', 400, 'WRONG_PASSWORD');
    user.password = newPassword;
    user.refreshToken = null;
    await user.save();
    await emailService.sendPasswordChangedEmail(user);
    return success(res, null, 'Password changed. Please login again.');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/settings/notifications
const updateNotificationSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.settings = { ...user.settings.toObject(), pushEnabled: req.body.pushEnabled ?? user.settings.pushEnabled, emailDigest: req.body.emailDigest ?? user.settings.emailDigest, smsEnabled: req.body.smsEnabled ?? user.settings.smsEnabled };
    await user.save();
    return success(res, user.settings, 'Notification settings updated');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/settings/theme
const updateTheme = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.settings = { ...user.settings.toObject(), darkMode: req.body.darkMode ?? user.settings.darkMode };
    await user.save();
    return success(res, user.settings, 'Theme updated');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/settings/deactivate
const deactivateAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.isActive = false;
    user.refreshToken = null;
    await user.save();
    return success(res, null, 'Account deactivated');
  } catch (error) {
    next(error);
  }
};

export { getAccountSettings, updateAccountSettings, changePassword, updateNotificationSettings, updateTheme, deactivateAccount };