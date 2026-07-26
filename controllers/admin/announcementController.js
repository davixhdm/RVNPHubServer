import Announcement from '../../models/admin/Announcement.js';
import User from '../../models/user/User.js';
import * as emailService from '../../services/emailService.js';
import * as smsService from '../../services/smsService.js';
import * as pushService from '../../services/pushService.js';
import * as socketService from '../../services/socketService.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

// GET /api/admin/announcements
const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 }).limit(50);
    return success(res, announcements, 'Announcements');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/announcements/:id
const getAnnouncementById = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
    return success(res, announcement, 'Announcement details');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/announcements
const createAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.create({ ...req.body, createdBy: req.admin._id });
    return created(res, announcement, 'Announcement created');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/announcements/:id
const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!announcement) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
    return success(res, announcement, 'Announcement updated');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/announcements/:id
const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
    return success(res, null, 'Announcement deleted');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/announcements/:id/send
const sendAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) throw new AppError('Announcement not found', 404, 'NOT_FOUND');

    let users = [];
    if (announcement.targetAudience === 'all') {
      users = await User.find({ isBanned: false }).select('email phone firebaseToken');
    } else if (announcement.targetAudience === 'department' && announcement.targetIds.length > 0) {
      users = await User.find({ department: { $in: announcement.targetIds }, isBanned: false }).select('email phone firebaseToken');
    }

    const channels = announcement.channels || ['in-app'];

    for (const user of users) {
      if (channels.includes('email')) await emailService.sendAnnouncementEmail(user, announcement.title, announcement.body, announcement.image);
      if (channels.includes('sms') && user.phone && announcement.priority === 'urgent') await smsService.sendUrgentAnnouncementSMS(user.phone, announcement.title);
      if (channels.includes('push')) await pushService.sendToUser(user._id, pushService.buildAnnouncementNotification(announcement.title));
      if (channels.includes('in-app')) socketService.emitToUser(user._id, 'announcement:new', { title: announcement.title, body: announcement.body });
    }

    announcement.status = 'sent';
    announcement.sentAt = new Date();
    announcement.deliveryStats = { sent: users.length, opened: 0, clicked: 0 };
    await announcement.save();

    logger.info(`Announcement sent: ${announcement.title} to ${users.length} users`);
    return success(res, announcement, `Announcement sent to ${users.length} users`);
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/announcements/:id/resend
const resendAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
    announcement.status = 'draft';
    await announcement.save();
    return await sendAnnouncement(req, res, next);
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/announcements/:id/schedule
const scheduleAnnouncement = async (req, res, next) => {
  try {
    const { scheduledAt } = req.body;
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, { status: 'scheduled', scheduledAt: new Date(scheduledAt) }, { new: true });
    if (!announcement) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
    return success(res, announcement, `Announcement scheduled for ${scheduledAt}`);
  } catch (error) {
    next(error);
  }
};

export { getAnnouncements, getAnnouncementById, createAnnouncement, updateAnnouncement, deleteAnnouncement, sendAnnouncement, resendAnnouncement, scheduleAnnouncement };