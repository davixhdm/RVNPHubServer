import sendEmail from '../config/hdmBridge.js';
import * as emailTemplates from '../templates/emailTemplates.js';
import logger from '../utils/logger.js';

// ============================================
// Auth Flow
// ============================================

export const sendWelcomeEmail = async (user) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getWelcomeEmail(user.firstName);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendWelcomeEmail failed:', error);
    return { success: false };
  }
};

export const sendVerificationCodeEmail = async (user, verificationLink) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getVerificationCodeEmail(user.firstName, verificationLink);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendVerificationCodeEmail failed:', error);
    return { success: false };
  }
};

export const sendPasswordResetEmail = async (user, resetLink) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getPasswordResetEmail(user.firstName, resetLink);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendPasswordResetEmail failed:', error);
    return { success: false };
  }
};

export const sendPasswordChangedEmail = async (user) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getPasswordChangedEmail(user.firstName);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendPasswordChangedEmail failed:', error);
    return { success: false };
  }
};

// ============================================
// HDM Verification Flow
// ============================================

export const sendVerificationApplicationReceivedEmail = async (user) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getVerificationApplicationReceivedEmail(user.firstName);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendVerificationApplicationReceivedEmail failed:', error);
    return { success: false };
  }
};

export const sendVerificationApprovedEmail = async (user) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getVerificationApprovedEmail(user.firstName);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendVerificationApprovedEmail failed:', error);
    return { success: false };
  }
};

export const sendVerificationRejectedEmail = async (user, reason) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getVerificationRejectedEmail(user.firstName, reason);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendVerificationRejectedEmail failed:', error);
    return { success: false };
  }
};

// ============================================
// Awards & Recognition
// ============================================

export const sendBadgeEarnedEmail = async (user, badgeName, badgeEmoji, badgeDescription) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getBadgeEarnedEmail(user.firstName, badgeName, badgeEmoji, badgeDescription);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendBadgeEarnedEmail failed:', error);
    return { success: false };
  }
};

export const sendWeeklyDigestEmail = async (user, stats, badges, leaderboardPosition) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getWeeklyDigestEmail(user.firstName, stats, badges, leaderboardPosition);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendWeeklyDigestEmail failed:', error);
    return { success: false };
  }
};

export const sendSpotlightFeaturedEmail = async (user, postPreview) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getSpotlightFeaturedEmail(user.firstName, postPreview);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendSpotlightFeaturedEmail failed:', error);
    return { success: false };
  }
};

// ============================================
// Support Flow
// ============================================

export const sendTicketCreatedEmail = async (user, ticketId, ticketSubject, message) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getTicketCreatedEmail(user.firstName, ticketId, ticketSubject, message);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendTicketCreatedEmail failed:', error);
    return { success: false };
  }
};

export const sendTicketResponseEmail = async (user, ticketId, response) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getTicketResponseEmail(user.firstName, ticketId, response);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendTicketResponseEmail failed:', error);
    return { success: false };
  }
};

export const sendTicketResolvedEmail = async (user, ticketId) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getTicketResolvedEmail(user.firstName, ticketId);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendTicketResolvedEmail failed:', error);
    return { success: false };
  }
};

// ============================================
// Moderation & Warnings
// ============================================

export const sendContentWarningEmail = async (user, contentPreview, reason) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getContentWarningEmail(user.firstName, contentPreview, reason);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendContentWarningEmail failed:', error);
    return { success: false };
  }
};

export const sendAccountSuspendedEmail = async (user, reason, duration) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getAccountSuspendedEmail(user.firstName, reason, duration);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendAccountSuspendedEmail failed:', error);
    return { success: false };
  }
};

export const sendAccountBannedEmail = async (user, reason) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getAccountBannedEmail(user.firstName, reason);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendAccountBannedEmail failed:', error);
    return { success: false };
  }
};

// ============================================
// Social & Engagement
// ============================================

export const sendOfflineMessageDigestEmail = async (user, unreadCount, previews) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getOfflineMessageDigestEmail(user.firstName, unreadCount, previews);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendOfflineMessageDigestEmail failed:', error);
    return { success: false };
  }
};

export const sendEventReminderEmail = async (user, eventName, location, time) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getEventReminderEmail(user.firstName, eventName, location, time);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendEventReminderEmail failed:', error);
    return { success: false };
  }
};

// ============================================
// Marketplace
// ============================================

export const sendListingInterestEmail = async (seller, buyerName, listingTitle, listingId) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getListingInterestEmail(seller.firstName, buyerName, listingTitle, listingId);
    return await sendEmail({ to: seller.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendListingInterestEmail failed:', error);
    return { success: false };
  }
};

export const sendListingSoldEmail = async (seller, listingTitle, price) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getListingSoldEmail(seller.firstName, listingTitle, price);
    return await sendEmail({ to: seller.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendListingSoldEmail failed:', error);
    return { success: false };
  }
};

// ============================================
// Admin Announcements
// ============================================

export const sendAnnouncementEmail = async (user, title, body, imageUrl) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getAnnouncementEmail(user.firstName, title, body, imageUrl);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendAnnouncementEmail failed:', error);
    return { success: false };
  }
};

// ============================================
// Subscription
// ============================================

export const sendSubscriptionExpiredEmail = async (user, planName) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getSubscriptionExpiredEmail(user.firstName, planName);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendSubscriptionExpiredEmail failed:', error);
    return { success: false };
  }
};

export const sendSubscriptionExpiringEmail = async (user, planName, expiryDate) => {
  try {
    const { subject, htmlBody, textBody } = await emailTemplates.getSubscriptionExpiringEmail(user.firstName, planName, expiryDate);
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendSubscriptionExpiringEmail failed:', error);
    return { success: false };
  }
};

// ============================================
// Payment
// ============================================

export const sendPaymentConfirmationEmail = async (user, amount, purpose) => {
  try {
    const subject = `Payment Confirmed — RVNP Campus Hub`;
    const htmlBody = `<h2>Payment Confirmed</h2><p>Your payment of <strong>KSh ${amount.toLocaleString()}</strong> has been received.</p><p>Purpose: ${purpose.replace(/_/g, ' ')}</p>`;
    const textBody = `Payment Confirmed: KSh ${amount.toLocaleString()} for ${purpose}`;
    return await sendEmail({ to: user.email, subject, htmlBody, textBody });
  } catch (error) {
    logger.error('sendPaymentConfirmationEmail failed:', error);
    return { success: false };
  }
};

// ============================================
// Custom Email (for backups, etc.)
// ============================================

export const sendCustomEmail = async ({ to, subject, htmlBody, textBody }) => {
  try {
    const result = await sendEmail({ to, subject, htmlBody, textBody });
    if (!result.success) {
      logger.error(`sendCustomEmail failed: ${JSON.stringify(result.error)}`);
    }
    return result;
  } catch (error) {
    logger.error('sendCustomEmail failed:', error);
    return { success: false, error: error.message };
  }
};