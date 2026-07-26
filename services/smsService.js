import sendSMS from '../config/brevo.js';
import * as smsTemplates from '../templates/smsTemplates.js';
import getSettings from '../utils/getSettings.js';
import logger from '../utils/logger.js';

const isWithinTimeWindow = async () => {
  const settings = await getSettings();
  if (!settings?.sms?.timeRestrictionEnabled) return true;
  const hour = new Date().getHours();
  return hour >= 8 && hour < 21;
};

// ============================================
// Auth Flow
// ============================================

export const sendVerificationCodeSMS = async (phone, code) => {
  try {
    const { body } = await smsTemplates.getVerificationCodeSMS(code);
    return await sendSMS({ phone, body });
  } catch (error) {
    logger.error('sendVerificationCodeSMS failed:', error);
    return { success: false };
  }
};

export const sendPasswordResetSMS = async (phone, code) => {
  try {
    const { body } = await smsTemplates.getPasswordResetSMS(code);
    return await sendSMS({ phone, body });
  } catch (error) {
    logger.error('sendPasswordResetSMS failed:', error);
    return { success: false };
  }
};

// ============================================
// HDM Verification
// ============================================

export const sendVerificationApprovedSMS = async (phone) => {
  try {
    const { body } = await smsTemplates.getVerificationApprovedSMS();
    return await sendSMS({ phone, body });
  } catch (error) {
    logger.error('sendVerificationApprovedSMS failed:', error);
    return { success: false };
  }
};

export const sendVerificationRejectedSMS = async (phone, reason) => {
  try {
    const { body } = await smsTemplates.getVerificationRejectedSMS(reason);
    return await sendSMS({ phone, body });
  } catch (error) {
    logger.error('sendVerificationRejectedSMS failed:', error);
    return { success: false };
  }
};

// ============================================
// Awards (Major Only)
// ============================================

export const sendBadgeEarnedSMS = async (phone, badgeName) => {
  try {
    if (!(await isWithinTimeWindow())) return { success: false, reason: 'outside_time_window' };
    const { body } = await smsTemplates.getBadgeEarnedSMS(badgeName);
    return await sendSMS({ phone, body });
  } catch (error) {
    logger.error('sendBadgeEarnedSMS failed:', error);
    return { success: false };
  }
};

export const sendSpotlightFeaturedSMS = async (phone) => {
  try {
    const { body } = await smsTemplates.getSpotlightFeaturedSMS();
    return await sendSMS({ phone, body });
  } catch (error) {
    logger.error('sendSpotlightFeaturedSMS failed:', error);
    return { success: false };
  }
};

// ============================================
// Events
// ============================================

export const sendEventReminderSMS = async (phone, eventName, location, time) => {
  try {
    if (!(await isWithinTimeWindow())) return { success: false, reason: 'outside_time_window' };
    const { body } = await smsTemplates.getEventReminderSMS(eventName, location, time);
    return await sendSMS({ phone, body });
  } catch (error) {
    logger.error('sendEventReminderSMS failed:', error);
    return { success: false };
  }
};

// ============================================
// Urgent Announcements (Always Send)
// ============================================

export const sendUrgentAnnouncementSMS = async (phone, title) => {
  try {
    const { body } = await smsTemplates.getUrgentAnnouncementSMS(title);
    return await sendSMS({ phone, body });
  } catch (error) {
    logger.error('sendUrgentAnnouncementSMS failed:', error);
    return { success: false };
  }
};

// ============================================
// Support
// ============================================

export const sendTicketResponseSMS = async (phone, ticketId) => {
  try {
    if (!(await isWithinTimeWindow())) return { success: false, reason: 'outside_time_window' };
    const { body } = await smsTemplates.getTicketResponseSMS(ticketId);
    return await sendSMS({ phone, body });
  } catch (error) {
    logger.error('sendTicketResponseSMS failed:', error);
    return { success: false };
  }
};

// ============================================
// Moderation (Always Send)
// ============================================

export const sendAccountSuspendedSMS = async (phone, duration) => {
  try {
    const { body } = await smsTemplates.getAccountSuspendedSMS(duration);
    return await sendSMS({ phone, body });
  } catch (error) {
    logger.error('sendAccountSuspendedSMS failed:', error);
    return { success: false };
  }
};