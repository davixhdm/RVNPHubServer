import Story from '../models/user/Story.js';
import * as cloudinaryService from '../services/cloudinaryService.js';
import logger from '../utils/logger.js';

export const cleanExpiredStories = async () => {
  try {
    const expiredStories = await Story.find({ expiresAt: { $lt: new Date() } });

    if (expiredStories.length === 0) {
      logger.info('No expired stories to clean');
      return { deleted: 0, storageFreedMB: 0 };
    }

    const publicIds = [];
    for (const story of expiredStories) {
      if (story.mediaUrl && story.mediaUrl.includes('cloudinary')) {
        const parts = story.mediaUrl.split('/');
        const filename = parts[parts.length - 1].split('.')[0];
        const folder = parts[parts.length - 2];
        publicIds.push(`hdm-rvnp/stories/${filename}`);
      }
    }

    if (publicIds.length > 0) {
      await cloudinaryService.deleteFiles(publicIds);
    }

    const result = await Story.deleteMany({ expiresAt: { $lt: new Date() } });

    logger.info(`Story cleanup: ${result.deletedCount} deleted`);
    return { deleted: result.deletedCount, storageFreedMB: publicIds.length * 2 };
  } catch (error) {
    logger.error('Story cleanup failed:', error);
    return { deleted: 0, storageFreedMB: 0 };
  }
};