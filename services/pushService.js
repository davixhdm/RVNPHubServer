import { messaging, FIREBASE_ENABLED } from '../config/firebase.js';
import logger from '../utils/logger.js';

export const sendToUser = async (userId, notification) => {
  if (!FIREBASE_ENABLED) {
    logger.info('Firebase disabled — push skipped');
    return { success: false, reason: 'firebase_disabled' };
  }

  try {
    const User = (await import('../models/user/User.js')).default;
    const user = await User.findById(userId).select('firebaseToken');
    if (!user?.firebaseToken) {
      return { success: false, reason: 'no_token' };
    }

    const message = {
      token: user.firebaseToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          icon: 'ic_notification',
          color: '#1B5E20',
          channelId: 'rvnp_default',
        },
      },
    };

    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    logger.error('sendToUser failed:', error);
    return { success: false, error: error.message };
  }
};

export const sendToUsers = async (userIds, notification) => {
  if (!FIREBASE_ENABLED) {
    return { success: false, reason: 'firebase_disabled' };
  }

  try {
    const User = (await import('../models/user/User.js')).default;
    const users = await User.find({ _id: { $in: userIds } }).select('firebaseToken');
    const tokens = users.filter(u => u.firebaseToken).map(u => u.firebaseToken);

    if (tokens.length === 0) {
      return { success: false, reason: 'no_tokens' };
    }

    const message = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          icon: 'ic_notification',
          color: '#1B5E20',
          channelId: 'rvnp_default',
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);
    return { success: true, successCount: response.successCount, failureCount: response.failureCount };
  } catch (error) {
    logger.error('sendToUsers failed:', error);
    return { success: false, error: error.message };
  }
};

export const sendToTopic = async (topic, notification) => {
  if (!FIREBASE_ENABLED) {
    return { success: false, reason: 'firebase_disabled' };
  }

  try {
    const message = {
      topic,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
    };

    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    logger.error('sendToTopic failed:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// Notification Builders
// ============================================

export const buildLikeNotification = (likerName, postPreview) => ({
  title: `${likerName} liked your post`,
  body: postPreview ? postPreview.substring(0, 80) : 'Tap to view',
  data: { type: 'like' },
});

export const buildCommentNotification = (commenterName, postPreview) => ({
  title: `${commenterName} commented on your post`,
  body: postPreview ? postPreview.substring(0, 80) : 'Tap to view',
  data: { type: 'comment' },
});

export const buildMessageNotification = (senderName, messagePreview) => ({
  title: senderName,
  body: messagePreview ? messagePreview.substring(0, 100) : 'New message',
  data: { type: 'message' },
});

export const buildBadgeNotification = (badgeName, badgeEmoji) => ({
  title: `${badgeEmoji} Badge Earned!`,
  body: `You earned: ${badgeName}`,
  data: { type: 'badge' },
});

export const buildEventReminderNotification = (eventName, time) => ({
  title: '⏰ Event Reminder',
  body: `${eventName} starts in ${time}`,
  data: { type: 'event_reminder' },
});

export const buildSpotlightNotification = () => ({
  title: '🌟 HDM Spotlight',
  body: 'Your post has been featured!',
  data: { type: 'spotlight' },
});

export const buildMarketInterestNotification = (buyerName, itemName) => ({
  title: '🛒 Someone is Interested',
  body: `${buyerName} wants your ${itemName}`,
  data: { type: 'market_interest' },
});

export const buildAnnouncementNotification = (title) => ({
  title: '📢 Announcement',
  body: title.substring(0, 100),
  data: { type: 'announcement' },
});

export const buildVerificationNotification = (status) => ({
  title: 'HDM Verification',
  body: status === 'approved' ? 'Your blue tick is active!' : 'Your verification status has been updated.',
  data: { type: 'verification' },
});