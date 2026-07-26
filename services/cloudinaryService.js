import cloudinary from '../config/cloudinary.js';
import getSettings from '../utils/getSettings.js';
import logger from '../utils/logger.js';

const FOLDER_PREFIX = 'hdm-rvnp';

// ============================================
// Upload Operations
// ============================================

export const uploadAvatar = async (file, userId) => {
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${FOLDER_PREFIX}/avatars`,
          public_id: `user_${userId}`,
          overwrite: true,
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(file.buffer);
    });
    return { success: true, url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    logger.error('uploadAvatar failed:', error);
    return { success: false, error: error.message };
  }
};

export const uploadPostImages = async (files, userId) => {
  try {
    const uploads = files.map((file, index) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `${FOLDER_PREFIX}/posts`,
            public_id: `post_${userId}_${Date.now()}_${index}`,
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
          },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(file.buffer);
      })
    );
    const results = await Promise.all(uploads);
    return { success: true, urls: results.map(r => r.secure_url), publicIds: results.map(r => r.public_id) };
  } catch (error) {
    logger.error('uploadPostImages failed:', error);
    return { success: false, error: error.message };
  }
};

export const uploadStory = async (file, userId, mediaType) => {
  try {
    const resourceType = mediaType === 'video' ? 'video' : 'image';
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${FOLDER_PREFIX}/stories`,
          public_id: `story_${userId}_${Date.now()}`,
          resource_type: resourceType,
          transformation: mediaType === 'video'
            ? [{ quality: 'auto', fetch_format: 'auto' }]
            : [{ quality: 'auto', fetch_format: 'auto', width: 800 }],
        },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(file.buffer);
    });
    return { success: true, url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    logger.error('uploadStory failed:', error);
    return { success: false, error: error.message };
  }
};

export const uploadGroupCover = async (file, groupId) => {
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${FOLDER_PREFIX}/groups`,
          public_id: `group_${groupId}_cover`,
          overwrite: true,
          transformation: [{ width: 800, height: 400, crop: 'fill' }],
        },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(file.buffer);
    });
    return { success: true, url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    logger.error('uploadGroupCover failed:', error);
    return { success: false, error: error.message };
  }
};

export const uploadMarketImages = async (files, listingId) => {
  try {
    const uploads = files.map((file, index) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `${FOLDER_PREFIX}/market`,
            public_id: `listing_${listingId}_${index}`,
            transformation: [{ quality: 'auto', fetch_format: 'auto', width: 600 }],
          },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(file.buffer);
      })
    );
    const results = await Promise.all(uploads);
    return { success: true, urls: results.map(r => r.secure_url), publicIds: results.map(r => r.public_id) };
  } catch (error) {
    logger.error('uploadMarketImages failed:', error);
    return { success: false, error: error.message };
  }
};

export const uploadChatFile = async (file, chatId, userId) => {
  try {
    const isPDF = file.mimetype === 'application/pdf';
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${FOLDER_PREFIX}/chats`,
          public_id: `chat_${chatId}_${userId}_${Date.now()}`,
          resource_type: isPDF ? 'raw' : 'image',
          transformation: isPDF ? [] : [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(file.buffer);
    });
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      fileName: file.originalname,
      fileSize: file.size,
    };
  } catch (error) {
    logger.error('uploadChatFile failed:', error);
    return { success: false, error: error.message };
  }
};

export const uploadVerificationDoc = async (file, userId) => {
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${FOLDER_PREFIX}/verification`,
          public_id: `verify_${userId}_${Date.now()}`,
        },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(file.buffer);
    });
    return { success: true, url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    logger.error('uploadVerificationDoc failed:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// Transformation Operations
// ============================================

export const getOptimizedUrl = (url, options = {}) => {
  if (!url || !url.includes('cloudinary')) return url;
  return cloudinary.url(url, {
    secure: true,
    quality: 'auto',
    fetch_format: 'auto',
    ...options,
  });
};

export const getAvatarUrl = (url, size = 100) => {
  if (!url || !url.includes('cloudinary')) return url;
  return cloudinary.url(url, {
    secure: true,
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'face',
  });
};

export const getThumbnailUrl = (url) => {
  if (!url || !url.includes('cloudinary')) return url;
  return cloudinary.url(url, {
    secure: true,
    width: 200,
    crop: 'scale',
  });
};

// ============================================
// Delete Operations
// ============================================

export const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return { success: true, result };
  } catch (error) {
    logger.error('deleteFile failed:', error);
    return { success: false, error: error.message };
  }
};

export const deleteFiles = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return { success: true, result };
  } catch (error) {
    logger.error('deleteFiles failed:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// Storage Info
// ============================================

export const getStorageUsage = async () => {
  try {
    const result = await cloudinary.api.usage();
    return { success: true, usage: result };
  } catch (error) {
    logger.error('getStorageUsage failed:', error);
    return { success: false, error: error.message };
  }
};