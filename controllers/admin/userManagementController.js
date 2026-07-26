import User from '../../models/user/User.js';
import Admin from '../../models/admin/Admin.js';
import AdminLog from '../../models/admin/AdminLog.js';
import Subscription from '../../models/user/Subscription.js';
import Badge from '../../models/user/Badge.js';
import Payment from '../../models/admin/Payment.js';
import * as emailService from '../../services/emailService.js';
import * as smsService from '../../services/smsService.js';
import * as pushService from '../../services/pushService.js';
import * as socketService from '../../services/socketService.js';
import paginate from '../../utils/paginate.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';
import Post from '../../models/user/Post.js';
import Listing from '../../models/user/Listing.js';

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { search, department, hostel, verified, status, page, limit } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (department) query.department = department;
    if (hostel) query.hostel = hostel;
    if (verified === 'true') query.hdmVerified = true;
    if (verified === 'false') query.hdmVerified = false;
    if (status === 'suspended') query.isSuspended = true;
    if (status === 'banned') query.isBanned = true;
    if (status === 'active') { query.isSuspended = false; query.isBanned = false; }

    const result = await paginate(User, query, {
      page, limit,
      sort: { createdAt: -1 },
      select: '-password -refreshToken -firebaseToken',
    });

    return success(res, result.data, 'Users retrieved', 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users/:id
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken -firebaseToken')
      .populate('activeSubscription');

    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const [posts, listings, badges, subscriptions] = await Promise.all([
      Post.countDocuments({ author: user._id }),
      Listing.countDocuments({ seller: user._id }),
      Badge.find({ user: user._id, isActive: true }),
      Subscription.find({ user: user._id }).sort({ createdAt: -1 }),
    ]);

    return success(res, { user, stats: { posts, listings, badgeCount: badges.length }, badges, subscriptions }, 'User details');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/users/:id
const updateUser = async (req, res, next) => {
  try {
    const { firstName, lastName, department, hostel, bio } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (department) user.department = department;
    if (hostel) user.hostel = hostel;
    if (bio !== undefined) user.bio = bio;
    await user.save();

    return success(res, { user: user.toJSON() }, 'User updated');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/users/:id/suspend
const suspendUser = async (req, res, next) => {
  try {
    const { reason, days } = req.body;
    if (!reason) throw new AppError('Suspension reason is required', 400, 'MISSING_REASON');

    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const duration = days ? `${days} days` : 'indefinitely';
    user.isSuspended = true;
    user.suspensionReason = reason;
    user.suspensionExpiresAt = days ? new Date(Date.now() + days * 86400000) : null;
    await user.save();

    await emailService.sendAccountSuspendedEmail(user, reason, duration);
    if (user.phone) await smsService.sendAccountSuspendedSMS(user.phone, duration);
    await pushService.sendToUser(user._id, { title: 'Account Suspended', body: `Your account has been suspended: ${reason}`, data: { type: 'suspension' } });
    socketService.emitToUser(user._id, 'user:suspended', { reason, expiresAt: user.suspensionExpiresAt });

    logger.info(`User suspended: ${user.email} by admin ${req.admin._id}`);
    return success(res, null, `User suspended for ${duration}`);
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/users/:id/unsuspend
const unsuspendUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    user.isSuspended = false;
    user.suspensionReason = null;
    user.suspensionExpiresAt = null;
    await user.save();

    socketService.emitToUser(user._id, 'user:unsuspended', {});
    logger.info(`User unsuspended: ${user.email} by admin ${req.admin._id}`);
    return success(res, null, 'User unsuspended');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/users/:id/ban
const banUser = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) throw new AppError('Ban reason is required', 400, 'MISSING_REASON');

    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    user.isBanned = true;
    user.isSuspended = false;
    user.refreshToken = null;
    await user.save();

    await emailService.sendAccountBannedEmail(user, reason);
    socketService.emitToUser(user._id, 'user:banned', { reason });

    logger.info(`User banned: ${user.email} by admin ${req.admin._id}`);
    return success(res, null, 'User banned permanently');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/users/:id/unban
const unbanUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    user.isBanned = false;
    await user.save();

    logger.info(`User unbanned: ${user.email} by admin ${req.admin._id}`);
    return success(res, null, 'User unbanned');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/users/:id/verify
const grantVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    if (user.hdmVerified) throw new AppError('User is already verified', 400, 'ALREADY_VERIFIED');

    user.hdmVerified = true;
    user.hdmVerifiedAt = new Date();
    await user.save();

    // Update payment status
    await Payment.updateMany(
      { user: user._id, purpose: 'verification_application', status: 'pending' },
      { status: 'paid', verifiedBy: req.admin._id }
    );

    await Badge.create({
      user: user._id, type: 'hdm_verified',
      name: 'HDM Verified', emoji: '🔵',
      description: 'HDM-granted VIP status',
      tier: 'permanent', awardedAt: new Date(), isActive: true,
    });

    await emailService.sendVerificationApprovedEmail(user);
    if (user.phone) await smsService.sendVerificationApprovedSMS(user.phone);
    await pushService.sendToUser(user._id, pushService.buildVerificationNotification('approved'));
    socketService.emitToUser(user._id, 'verification:approved', { hdmVerified: true });

    logger.info(`HDM Verified granted to ${user.email} by admin ${req.admin._id}`);
    return success(res, null, 'HDM Verification granted');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/users/:id/unverify
// POST /api/admin/users/:id/unverify
const revokeVerification = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    user.hdmVerified = false;
    user.hdmVerifiedAt = null;
    await user.save();

    // Mark payment as cancelled
    await Payment.updateMany(
      { user: user._id, purpose: 'verification_application', status: 'pending' },
      { status: 'cancelled', refundReason: reason || 'Rejected by admin' }
    );

    await Badge.updateMany(
      { user: user._id, type: 'hdm_verified', isActive: true },
      { isActive: false, revokedAt: new Date(), revokeReason: reason || 'Revoked by admin' }
    );

    await emailService.sendVerificationRejectedEmail(user, reason || 'Application rejected');
    if (user.phone) await smsService.sendVerificationRejectedSMS(user.phone, reason || 'Rejected');
    socketService.emitToUser(user._id, 'verification:revoked', { reason });

    logger.info(`HDM Verification revoked from ${user.email} by admin ${req.admin._id}`);
    return success(res, null, 'HDM Verification revoked');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/verification-queue
const getVerificationQueue = async (req, res, next) => {
  try {
    const applications = await Payment.find({
      purpose: 'verification_application',
      status: { $in: ['pending', 'paid'] }
    })
      .populate('user', 'firstName lastName email department hostel createdAt')
      .sort({ createdAt: -1 });

    return success(res, applications, 'Verification queue');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    await Promise.all([
      Post.deleteMany({ author: user._id }),
      Story.deleteMany({ author: user._id }),
      Listing.deleteMany({ seller: user._id }),
      Chat.deleteMany({ participants: user._id }),
      Badge.deleteMany({ user: user._id }),
      Notification.deleteMany({ recipient: user._id }),
      Subscription.deleteMany({ user: user._id }),
    ]);

    logger.info(`User deleted: ${user.email} by admin ${req.admin._id}`);
    return success(res, null, 'User and all associated data deleted');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/admins
const getAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.find().select('-password -refreshToken -twoFactorSecret').sort({ createdAt: -1 });
    return success(res, admins, 'Admin accounts retrieved');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/audit-logs
const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { adminEmail: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
      ];
    }

    const result = await paginate(AdminLog, query, {
      page, limit: limit || 20,
      sort: { createdAt: -1 },
    });

    return success(res, result.data, 'Audit logs retrieved', 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/verification-queue/:id/approve
const approveVerificationFromQueue = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');

    const user = await User.findById(payment.user);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    if (user.hdmVerified) throw new AppError('User is already verified', 400, 'ALREADY_VERIFIED');

    user.hdmVerified = true;
    user.hdmVerifiedAt = new Date();
    await user.save();

    payment.status = 'paid';
    payment.verifiedBy = req.admin._id;
    await payment.save();

    await Badge.create({
      user: user._id, type: 'hdm_verified',
      name: 'HDM Verified', emoji: '🔵',
      description: 'HDM-granted VIP status',
      tier: 'permanent', awardedAt: new Date(), isActive: true,
    });

    await emailService.sendVerificationApprovedEmail(user);
    if (user.phone) await smsService.sendVerificationApprovedSMS(user.phone);
    await pushService.sendToUser(user._id, pushService.buildVerificationNotification('approved'));
    socketService.emitToUser(user._id, 'verification:approved', { hdmVerified: true });

    logger.info(`HDM Verified granted to ${user.email} via queue by admin ${req.admin._id}`);
    return success(res, null, 'Verification approved');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/verification-queue/:id/reject
const rejectVerificationFromQueue = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');

    const user = await User.findById(payment.user);
    if (user) {
      user.hdmVerified = false;
      user.hdmVerifiedAt = null;
      await user.save();
    }

    payment.status = 'cancelled';
    payment.refundReason = reason || 'Rejected by admin';
    await payment.save();

    if (user) {
      await Badge.updateMany(
        { user: user._id, type: 'hdm_verified', isActive: true },
        { isActive: false, revokedAt: new Date(), revokeReason: reason || 'Application rejected' }
      );

      await emailService.sendVerificationRejectedEmail(user, reason || 'Application rejected');
      if (user.phone) await smsService.sendVerificationRejectedSMS(user.phone, reason || 'Rejected');
      socketService.emitToUser(user._id, 'verification:revoked', { reason });
    }

    logger.info(`Verification rejected for ${user?.email} via queue by admin ${req.admin._id}`);
    return success(res, null, 'Verification rejected');
  } catch (error) {
    next(error);
  }
};


export {
  getUsers, getUserById, updateUser, suspendUser, unsuspendUser,
  banUser, unbanUser, grantVerification, revokeVerification,
  getVerificationQueue, deleteUser, getAdmins, getAuditLogs,
  approveVerificationFromQueue, rejectVerificationFromQueue,
};