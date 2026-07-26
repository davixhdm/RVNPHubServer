import Post from '../../models/user/Post.js';
import Story from '../../models/user/Story.js';
import Listing from '../../models/user/Listing.js';
import User from '../../models/user/User.js';
import * as emailService from '../../services/emailService.js';
import * as pushService from '../../services/pushService.js';
import * as socketService from '../../services/socketService.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

// GET /api/admin/moderation/queue
const getModerationQueue = async (req, res, next) => {
  try {
    const [flaggedPosts, flaggedStories, flaggedListings] = await Promise.all([
      Post.find({ moderationStatus: 'flagged' }).populate('author', 'firstName lastName email').sort({ createdAt: -1 }).limit(50),
      Story.find({ moderationStatus: 'flagged' }).populate('author', 'firstName lastName email').sort({ createdAt: -1 }).limit(50),
      Listing.find({ moderationStatus: 'flagged' }).populate('seller', 'firstName lastName email').sort({ createdAt: -1 }).limit(50),
    ]);

    return success(res, { posts: flaggedPosts, stories: flaggedStories, listings: flaggedListings }, 'Moderation queue');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/moderation/:id/approve
const approveContent = async (req, res, next) => {
  try {
    const { type } = req.body;
    const Model = type === 'story' ? Story : type === 'listing' ? Listing : Post;
    const content = await Model.findByIdAndUpdate(req.params.id, { moderationStatus: 'approved' }, { new: true });

    if (!content) throw new AppError('Content not found', 404, 'NOT_FOUND');

    logger.info(`Content approved: ${req.params.id} by admin ${req.admin._id}`);
    return success(res, null, 'Content approved');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/moderation/:id/remove
const removeContent = async (req, res, next) => {
  try {
    const { type, reason } = req.body;
    const Model = type === 'story' ? Story : type === 'listing' ? Listing : Post;
    const content = await Model.findByIdAndUpdate(req.params.id, { moderationStatus: 'removed', status: 'removed' }, { new: true });

    if (!content) throw new AppError('Content not found', 404, 'NOT_FOUND');

    const userId = content.author || content.seller;
    const user = await User.findById(userId);

    if (user) {
      const preview = content.content || content.caption || content.title || 'Your content';
      await emailService.sendContentWarningEmail(user, preview, reason || 'Violation of community guidelines');
      await pushService.sendToUser(user._id, { title: 'Content Removed', body: `Your content was removed: ${reason || 'Policy violation'}`, data: { type: 'moderation' } });
      socketService.emitToUser(user._id, 'moderation:removed', { contentId: req.params.id, reason });
    }

    logger.info(`Content removed: ${req.params.id} by admin ${req.admin._id}`);
    return success(res, null, 'Content removed and user notified');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/moderation/:id/warn
const warnUser = async (req, res, next) => {
  try {
    const { userId, reason } = req.body;
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    await emailService.sendContentWarningEmail(user, 'Your recent activity', reason);
    await pushService.sendToUser(user._id, { title: 'Warning', body: reason, data: { type: 'warning' } });
    socketService.emitToUser(user._id, 'moderation:warning', { reason });

    logger.info(`User warned: ${user.email} by admin ${req.admin._id}`);
    return success(res, null, 'Warning sent to user');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/moderation/history
const getModerationHistory = async (req, res, next) => {
  try {
    const AdminLog = (await import('../../models/admin/AdminLog.js')).default;
    const logs = await AdminLog.find({ action: { $in: ['approve-content', 'remove-content', 'warn-user', 'moderate-content'] } })
      .sort({ createdAt: -1 })
      .limit(100);

    return success(res, logs, 'Moderation history');
  } catch (error) {
    next(error);
  }
};

export { getModerationQueue, approveContent, removeContent, warnUser, getModerationHistory };