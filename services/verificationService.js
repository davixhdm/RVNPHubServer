import User from '../models/user/User.js';
import Payment from '../models/admin/Payment.js';
import * as aiService from './aiService.js';
import * as emailService from './emailService.js';
import * as smsService from './smsService.js';
import * as pushService from './pushService.js';
import * as socketService from './socketService.js';
import getSettings from '../utils/getSettings.js';
import logger from '../utils/logger.js';

export const applyForVerification = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return { success: false, message: 'User not found' };
    if (user.hdmVerified) return { success: false, message: 'Already verified' };

    await emailService.sendVerificationApplicationReceivedEmail(user);
    socketService.emitToUser(userId, 'verification:applied', { status: 'pending' });

    return { success: true, message: 'Application received' };
  } catch (error) {
    logger.error('applyForVerification failed:', error);
    return { success: false, message: error.message };
  }
};

export const approveVerification = async (userId, adminId) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { hdmVerified: true, hdmVerifiedAt: new Date() },
      { new: true }
    );

    if (!user) return { success: false, message: 'User not found' };

    await emailService.sendVerificationApprovedEmail(user);
    if (user.phone) await smsService.sendVerificationApprovedSMS(user.phone);
    await pushService.sendToUser(userId, pushService.buildVerificationNotification('approved'));
    socketService.emitToUser(userId, 'verification:approved', { hdmVerified: true });

    logger.info(`HDM Verified granted to ${user.email} by admin ${adminId}`);
    return { success: true };
  } catch (error) {
    logger.error('approveVerification failed:', error);
    return { success: false, message: error.message };
  }
};

export const rejectVerification = async (userId, reason, adminId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return { success: false, message: 'User not found' };

    await emailService.sendVerificationRejectedEmail(user, reason);
    if (user.phone) await smsService.sendVerificationRejectedSMS(user.phone, reason);
    socketService.emitToUser(userId, 'verification:rejected', { reason });

    logger.info(`HDM Verification rejected for ${user.email} by admin ${adminId}`);
    return { success: true };
  } catch (error) {
    logger.error('rejectVerification failed:', error);
    return { success: false, message: error.message };
  }
};

export const revokeVerification = async (userId, reason, adminId) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { hdmVerified: false, hdmVerifiedAt: null },
      { new: true }
    );

    if (!user) return { success: false, message: 'User not found' };

    socketService.emitToUser(userId, 'verification:revoked', { reason });
    logger.info(`HDM Verified revoked from ${user.email} by admin ${adminId}`);
    return { success: true };
  } catch (error) {
    logger.error('revokeVerification failed:', error);
    return { success: false, message: error.message };
  }
};