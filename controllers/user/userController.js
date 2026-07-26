import User from '../../models/user/User.js';
import Post from '../../models/user/Post.js';
import Listing from '../../models/user/Listing.js';
import Badge from '../../models/user/Badge.js';
import Subscription from '../../models/user/Subscription.js';
import * as emailService from '../../services/emailService.js';
import * as cloudinaryService from '../../services/cloudinaryService.js';
import * as socketService from '../../services/socketService.js';
import paginate from '../../utils/paginate.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import getSettings from '../../utils/getSettings.js';
import logger from '../../utils/logger.js';

// GET /api/users/:id
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshToken -firebaseToken');
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    if (req.user && user.blockedUsers?.includes(req.user._id)) throw new AppError('User unavailable', 403, 'USER_BLOCKED');
    if (user.privacy?.hideProfile && (!req.user || req.user._id.toString() !== user._id.toString())) {
      return success(res, { user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar, coverPhoto: user.coverPhoto, hdmVerified: user.hdmVerified, privacy: { hideProfile: true } } }, 'Profile private');
    }
    const badges = await Badge.find({ user: user._id, isActive: true });
    const postCount = await Post.countDocuments({ author: user._id, status: 'active' });
    const profileData = user.toJSON();
    profileData.postCount = postCount;
    profileData.badges = badges;
    if (req.user && req.user._id.toString() !== user._id.toString()) {
      if (user.privacy?.hideLastSeen) delete profileData.lastSeen;
      if (user.privacy?.hideOnlineStatus) delete profileData.isOnline;
      if (!user.privacy?.showDepartment) delete profileData.department;
      if (!user.privacy?.showHostel) delete profileData.hostel;
    }
    return success(res, { user: profileData, badges }, 'User profile');
  } catch (error) { next(error); }
};

// GET /api/users/me
const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken -firebaseToken').populate('activeSubscription');
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    const badges = await Badge.find({ user: user._id, isActive: true });
    const subscription = await Subscription.findOne({ user: user._id, status: 'active' });
    const postCount = await Post.countDocuments({ author: user._id, status: 'active' });
    const profileData = user.toJSON();
    profileData.postCount = postCount;
    profileData.badges = badges;
    return success(res, { user: profileData, badges, subscription }, 'My profile');
  } catch (error) { next(error); }
};

// PATCH /api/users/me
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, department, hostel, campus, bio, interests, avatar, coverPhoto } = req.body;
    const user = await User.findById(req.user._id);
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (department !== undefined) user.department = department;
    if (hostel) user.hostel = hostel;
    if (campus) user.campus = campus;
    if (bio !== undefined) user.bio = bio;
    if (interests) user.interests = interests;
    if (avatar !== undefined) user.avatar = avatar;
    if (coverPhoto !== undefined) user.coverPhoto = coverPhoto;
    await user.save();
    return success(res, { user: user.toJSON() }, 'Profile updated');
  } catch (error) { next(error); }
};

// POST /api/users/me/avatar
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('Image required', 400, 'FILE_REQUIRED');
    const result = await cloudinaryService.uploadAvatar(req.file, req.user._id);
    if (!result.success) throw new AppError('Upload failed', 500, 'UPLOAD_FAILED');
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: result.url }, { new: true });
    return success(res, { user: user.toJSON() }, 'Avatar updated');
  } catch (error) { next(error); }
};

// POST /api/users/me/cover
const uploadCover = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('Image required', 400, 'FILE_REQUIRED');
    const result = await cloudinaryService.uploadGroupCover(req.file, req.user._id);
    if (!result.success) throw new AppError('Upload failed', 500, 'UPLOAD_FAILED');
    const user = await User.findByIdAndUpdate(req.user._id, { coverPhoto: result.url }, { new: true });
    return success(res, { user: user.toJSON() }, 'Cover updated');
  } catch (error) { next(error); }
};

// DELETE /api/users/me/cover
const removeCover = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { coverPhoto: null }, { new: true });
    return success(res, { user: user.toJSON() }, 'Cover removed');
  } catch (error) { next(error); }
};

// DELETE /api/users/me
const deleteAccount = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    await Post.deleteMany({ author: req.user._id });
    await Listing.deleteMany({ seller: req.user._id });
    return success(res, null, 'Account deleted');
  } catch (error) { next(error); }
};

// PATCH /api/users/me/settings
const updateSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.settings = { ...user.settings.toObject(), ...req.body };
    await user.save();
    return success(res, { settings: user.settings }, 'Settings updated');
  } catch (error) { next(error); }
};

// GET /api/users/:id/badges
const getUserBadges = async (req, res, next) => {
  try {
    const badges = await Badge.find({ user: req.params.id, isActive: true });
    return success(res, badges, 'User badges');
  } catch (error) { next(error); }
};

// GET /api/users/:id/posts
const getUserPosts = async (req, res, next) => {
  try {
    const result = await paginate(Post, { author: req.params.id, status: 'active', moderationStatus: { $ne: 'removed' } }, { page: req.query.page, sort: { createdAt: -1 } });
    return success(res, result.data, 'User posts', 200, { pagination: result.pagination });
  } catch (error) { next(error); }
};

// GET /api/users/:id/listings
const getUserListings = async (req, res, next) => {
  try {
    const result = await paginate(Listing, { seller: req.params.id, status: 'active' }, { page: req.query.page, sort: { createdAt: -1 } });
    return success(res, result.data, 'User listings', 200, { pagination: result.pagination });
  } catch (error) { next(error); }
};

// POST /api/users/me/verify
const applyVerification = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.verification) throw new AppError('Verification is currently closed', 403, 'VERIFICATION_CLOSED');
    
    const user = await User.findById(req.user._id);
    if (user.hdmVerified) throw new AppError('Already verified', 400, 'ALREADY_VERIFIED');

    const Payment = (await import('../../models/admin/Payment.js')).default;
    
    await Payment.create({
      user: user._id,
      amount: req.body.amount || 0,
      paymentMethodType: 'mpesa',
      paymentMethodSlug: req.body.paymentMethod || 'mpesa-stkpush',
      purpose: 'verification_application',
      plan: req.body.planId || null,
      status: 'pending',
      mpesaPhone: req.body.phone || user.phone || null,
      confirmationCode: req.body.confirmationCode || null,
    });

    await emailService.sendVerificationApplicationReceivedEmail(user);
    socketService.emitToUser(user._id, 'verification:applied', { status: 'pending' });
    
    return success(res, null, 'Verification application submitted');
  } catch (error) {
    next(error);
  }
};

// GET /api/users/me/verification-status
const checkVerificationStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    return success(res, { verified: user.hdmVerified, verifiedAt: user.hdmVerifiedAt }, 'Status');
  } catch (error) { next(error); }
};

// PATCH /api/users/me/firebase-token
const updateFirebaseToken = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { firebaseToken: req.body.token });
    return success(res, null, 'Token updated');
  } catch (error) { next(error); }
};

// POST /api/users/me/online
const toggleOnline = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { isOnline: req.body.online !== false, lastSeen: new Date() }, { new: true });
    return success(res, { online: user.isOnline }, 'Status updated');
  } catch (error) { next(error); }
};

export {
  getProfile, getMyProfile, updateProfile, uploadAvatar, uploadCover, removeCover,
  deleteAccount, updateSettings, getUserBadges, getUserPosts, getUserListings,
  applyVerification, checkVerificationStatus, updateFirebaseToken, toggleOnline,
};