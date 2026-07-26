import Post from '../../models/user/Post.js';
import User from '../../models/user/User.js';
import * as emailService from '../../services/emailService.js';
import * as smsService from '../../services/smsService.js';
import * as pushService from '../../services/pushService.js';
import * as socketService from '../../services/socketService.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

// GET /api/admin/spotlight
const getSpotlights = async (req, res, next) => {
  try {
    const spotlights = await Post.find({ isSpotlight: true, spotlightExpiresAt: { $gt: new Date() } })
      .populate('author', 'firstName lastName avatar')
      .sort({ spotlightExpiresAt: -1 });

    return success(res, spotlights, 'Active spotlights');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/spotlight/:postId
const featurePost = async (req, res, next) => {
  try {
    const { days } = req.body;
    const duration = days || 7;

    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError('Post not found', 404, 'POST_NOT_FOUND');

    post.isSpotlight = true;
    post.spotlightExpiresAt = new Date(Date.now() + duration * 86400000);
    await post.save();

    const user = await User.findById(post.author);
    if (user) {
      const preview = post.content ? post.content.substring(0, 100) : 'Your post';
      await emailService.sendSpotlightFeaturedEmail(user, preview);
      if (user.phone) await smsService.sendSpotlightFeaturedSMS(user.phone);
      await pushService.sendToUser(user._id, pushService.buildSpotlightNotification());
      socketService.emitToUser(user._id, 'spotlight:featured', { postId: post._id, expiresAt: post.spotlightExpiresAt });
    }

    logger.info(`Post featured in spotlight: ${post._id} by admin ${req.admin._id}`);
    return success(res, { post }, `Post featured for ${duration} days`);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/spotlight/:postId
const removeSpotlight = async (req, res, next) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { isSpotlight: false, spotlightExpiresAt: null }, { new: true });
    if (!post) throw new AppError('Post not found', 404, 'POST_NOT_FOUND');

    logger.info(`Spotlight removed: ${post._id} by admin ${req.admin._id}`);
    return success(res, null, 'Spotlight removed');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/spotlight/:postId/extend
const extendSpotlight = async (req, res, next) => {
  try {
    const { days } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post || !post.isSpotlight) throw new AppError('Spotlight post not found', 404, 'NOT_FOUND');

    const currentExpiry = post.spotlightExpiresAt || new Date();
    post.spotlightExpiresAt = new Date(currentExpiry.getTime() + (days || 7) * 86400000);
    await post.save();

    return success(res, { post }, `Spotlight extended by ${days || 7} days`);
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/spotlight/history
const getSpotlightHistory = async (req, res, next) => {
  try {
    const history = await Post.find({ isSpotlight: true, spotlightExpiresAt: { $lt: new Date() } })
      .populate('author', 'firstName lastName')
      .sort({ spotlightExpiresAt: -1 })
      .limit(50);

    return success(res, history, 'Spotlight history');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/spotlight/queue
const getSpotlightQueue = async (req, res, next) => {
  try {
    const candidates = await Post.find({ status: 'active', moderationStatus: 'approved', isSpotlight: false })
      .sort({ likeCount: -1, commentCount: -1 })
      .limit(20)
      .populate('author', 'firstName lastName avatar');

    return success(res, candidates, 'Spotlight candidates');
  } catch (error) {
    next(error);
  }
};

export { getSpotlights, featurePost, removeSpotlight, extendSpotlight, getSpotlightHistory, getSpotlightQueue };