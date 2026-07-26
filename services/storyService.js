import Story from '../models/user/Story.js';
import User from '../models/user/User.js';
import * as cloudinaryService from './cloudinaryService.js';
import * as moderationService from './moderationService.js';
import * as socketService from './socketService.js';
import logger from '../utils/logger.js';

export const createStory = async (userId, file, caption, location, mediaType) => {
  try {
    const upload = await cloudinaryService.uploadStory(file, userId, mediaType);
    if (!upload.success) return { success: false, message: 'Upload failed' };

    const moderation = await moderationService.reviewContent(caption, upload.url);
    if (moderation.status === 'removed') {
      await cloudinaryService.deleteFile(upload.publicId);
      return { success: false, message: 'Content violates guidelines' };
    }

    const story = await Story.create({
      author: userId,
      mediaUrl: upload.url,
      mediaType,
      caption,
      location,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      moderationStatus: moderation.status === 'flagged' ? 'flagged' : 'approved',
    });

    const user = await User.findById(userId);
    socketService.newStoryAvailable(userId, story);
    if (user.department) {
      socketService.departmentStoryAdded(user.department, story);
    }

    return { success: true, story };
  } catch (error) {
    logger.error('createStory failed:', error);
    return { success: false, message: error.message };
  }
};

export const getActiveStories = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return [];

    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
      moderationStatus: { $ne: 'removed' },
      $or: [
        { author: { $in: [userId] } },
        { author: { $in: [] } }, // friends logic here
        { isOfficial: true },
        { department: user.department, isDepartment: true },
      ],
    })
      .sort({ isOfficial: -1, createdAt: -1 })
      .populate('author', 'firstName lastName avatar hdmVerified');

    return stories;
  } catch (error) {
    logger.error('getActiveStories failed:', error);
    return [];
  }
};

export const cleanExpiredStories = async () => {
  try {
    const expired = await Story.find({ expiresAt: { $lt: new Date() } });
    const publicIds = expired.map(s => s.url).filter(Boolean);

    if (publicIds.length > 0) {
      await cloudinaryService.deleteFiles(publicIds);
    }

    const result = await Story.deleteMany({ expiresAt: { $lt: new Date() } });
    logger.info(`Cleaned ${result.deletedCount} expired stories`);
    return result.deletedCount;
  } catch (error) {
    logger.error('cleanExpiredStories failed:', error);
    return 0;
  }
};