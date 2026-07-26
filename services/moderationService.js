import * as aiService from './aiService.js';
import * as emailService from './emailService.js';
import * as smsService from './smsService.js';
import * as pushService from './pushService.js';
import * as socketService from './socketService.js';
import getSettings from '../utils/getSettings.js';
import logger from '../utils/logger.js';

export const reviewContent = async (text, imageUrl) => {
  try {
    const settings = await getSettings();
    const sensitivity = settings?.ai?.moderationSensitivity || 0.75;
    const autoRemoveThreshold = sensitivity + 0.2;

    let flagged = false;
    let confidence = 0;
    let reason = null;

    if (text) {
      const textResult = await aiService.moderateText(text);
      if (textResult.flagged && textResult.confidence > confidence) {
        flagged = true;
        confidence = textResult.confidence;
        reason = textResult.reason;
      }
    }

    if (imageUrl) {
      const imageResult = await aiService.moderateImage(imageUrl);
      if (imageResult.flagged && imageResult.confidence > confidence) {
        flagged = true;
        confidence = imageResult.confidence;
        reason = imageResult.reason;
      }
    }

    if (!flagged) return { status: 'approved' };

    if (confidence >= autoRemoveThreshold) {
      return { status: 'removed', reason, confidence, auto: true };
    }

    if (confidence >= sensitivity) {
      return { status: 'flagged', reason, confidence, auto: false };
    }

    return { status: 'approved' };
  } catch (error) {
    logger.error('reviewContent failed:', error);
    return { status: 'approved' };
  }
};

export const warnUser = async (user, contentPreview, reason) => {
  try {
    await emailService.sendContentWarningEmail(user, contentPreview, reason);
    if (user.phone) {
      await smsService.sendAccountSuspendedSMS(user.phone, 'Warning issued');
    }
    await pushService.sendToUser(user._id, {
      title: 'Content Warning',
      body: `Your content was removed: ${reason}`,
      data: { type: 'moderation' },
    });
    socketService.emitToUser(user._id, 'moderation:warning', { reason });
  } catch (error) {
    logger.error('warnUser failed:', error);
  }
};