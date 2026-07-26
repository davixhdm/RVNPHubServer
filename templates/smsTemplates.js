import getSettings from '../utils/getSettings.js';

const getSystemName = async () => {
  const settings = await getSettings();
  return settings?.general?.systemName || 'RVNP Campus Hub';
};

const getSupportPhone = async () => {
  const settings = await getSettings();
  return settings?.general?.supportPhone || '';
};

// ============================================
// Auth Flow
// ============================================

export const getVerificationCodeSMS = async (code) => {
  const systemName = await getSystemName();
  return {
    body: `Your ${systemName} verification code is ${code}. Valid for 10 minutes. — HDM`,
  };
};

export const getPasswordResetSMS = async (code) => {
  const systemName = await getSystemName();
  return {
    body: `${systemName} password reset code: ${code}. Valid for 10 minutes. — HDM`,
  };
};

// ============================================
// HDM Verification
// ============================================

export const getVerificationApprovedSMS = async () => {
  const systemName = await getSystemName();
  return {
    body: `Congrats! You are now HDM Verified on ${systemName}. Your blue tick is active. — HDM`,
  };
};

export const getVerificationRejectedSMS = async (reason) => {
  const systemName = await getSystemName();
  const shortReason = reason && reason.length > 60 ? reason.substring(0, 57) + '...' : reason || 'Criteria not met';
  return {
    body: `${systemName}: HDM Verification update — ${shortReason} Log in for details. — HDM`,
  };
};

// ============================================
// Awards (Major Only)
// ============================================

export const getBadgeEarnedSMS = async (badgeName) => {
  const systemName = await getSystemName();
  return {
    body: `You earned ${badgeName} on ${systemName}! View your profile now. — HDM`,
  };
};

export const getSpotlightFeaturedSMS = async () => {
  const systemName = await getSystemName();
  return {
    body: `Your post is in the HDM Spotlight this week on ${systemName}! Check the Explore page. — HDM`,
  };
};

// ============================================
// Events
// ============================================

export const getEventReminderSMS = async (eventName, location, time) => {
  const systemName = await getSystemName();
  const shortName = eventName.length > 40 ? eventName.substring(0, 37) + '...' : eventName;
  return {
    body: `${systemName}: Reminder — ${shortName} at ${location} starts ${time}. See you there! — HDM`,
  };
};

// ============================================
// Urgent Announcements
// ============================================

export const getUrgentAnnouncementSMS = async (title) => {
  const systemName = await getSystemName();
  const shortTitle = title.length > 80 ? title.substring(0, 77) + '...' : title;
  return {
    body: `URGENT — ${systemName}: ${shortTitle} Open app for details. — HDM`,
  };
};

// ============================================
// Support
// ============================================

export const getTicketResponseSMS = async (ticketId) => {
  const systemName = await getSystemName();
  return {
    body: `${systemName}: Your support ticket #${ticketId} has a new response. Check your email. — HDM`,
  };
};

// ============================================
// Moderation (Urgent Only)
// ============================================

export const getAccountSuspendedSMS = async (duration) => {
  const systemName = await getSystemName();
  const supportPhone = await getSupportPhone();
  const contact = supportPhone ? ` Contact ${supportPhone}.` : '';
  return {
    body: `${systemName}: Your account has been suspended for ${duration}.${contact} — HDM`,
  };
};