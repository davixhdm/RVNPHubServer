import Notification from '../../models/user/Notification.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 30;
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments({ recipient: req.user._id }),
    ]);
    return success(res, notifications, 'Notifications', 200, { pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total, hasNext: skip + limit < total, hasPrev: page > 1 } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
    return success(res, null, 'Marked as read');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notifications/read-all
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
    return success(res, null, 'All marked as read');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/notifications/:id
const deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    return success(res, null, 'Notification deleted');
  } catch (error) {
    next(error);
  }
};

// GET /api/notifications/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return success(res, { count }, 'Unread count');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notifications/preferences
const updatePreferences = async (req, res, next) => {
  try {
    const User = (await import('../../models/user/User.js')).default;
    const user = await User.findById(req.user._id);
    user.settings = { ...user.settings.toObject(), pushEnabled: req.body.pushEnabled ?? user.settings.pushEnabled, emailDigest: req.body.emailDigest ?? user.settings.emailDigest, smsEnabled: req.body.smsEnabled ?? user.settings.smsEnabled };
    await user.save();
    return success(res, user.settings, 'Preferences updated');
  } catch (error) {
    next(error);
  }
};

export { getNotifications, markAsRead, markAllAsRead, deleteNotification, getUnreadCount, updatePreferences };