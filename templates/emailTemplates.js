import getSettings from '../utils/getSettings.js';

const getBranding = async () => {
  const settings = await getSettings();
  return {
    systemName: settings?.general?.systemName || 'RVNP Campus Hub',
    supportEmail: settings?.general?.supportEmail || 'support@hdm.com',
    supportPhone: settings?.general?.supportPhone || '',
    logo: settings?.general?.logo || '',
    companyName: 'HDM',
  };
};

const baseTemplate = async ({ userName, title, body, actionText, actionUrl, secondaryText }) => {
  const { systemName, supportEmail, supportPhone, companyName } = await getBranding();
  const currentYear = new Date().getFullYear();
  const actionButton = actionText && actionUrl
    ? `<a href="${actionUrl}" class="button">${actionText}</a>`
    : '';

  return {
    htmlBody: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F5F5F0;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5F0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1B5E20;padding:32px 40px;text-align:center;">
              <h1 style="color:#FFFFFF;font-size:22px;margin:0;font-weight:700;letter-spacing:0.5px;">${systemName}</h1>
              <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:6px 0 0 0;">from ${companyName}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#4A5A4A;font-size:15px;margin:0 0 8px 0;">Hello ${userName},</p>
              <h2 style="color:#212121;font-size:20px;margin:0 0 20px 0;font-weight:700;">${title}</h2>
              <p style="color:#4A5A4A;font-size:15px;line-height:1.7;margin:0 0 24px 0;">${body}</p>
              ${actionButton}
              ${secondaryText ? `<p style="color:#9E9E9E;font-size:13px;line-height:1.6;margin:24px 0 0 0;">${secondaryText}</p>` : ''}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #E8F5E9;margin:0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 40px 32px;text-align:center;">
              <p style="color:#4A5A4A;font-size:13px;margin:0 0 4px 0;font-weight:600;">${systemName} — from ${companyName}</p>
              <p style="color:#9E9E9E;font-size:12px;margin:0 0 2px 0;">
                Need help? Contact us at
                <a href="mailto:${supportEmail}" style="color:#2E7D32;text-decoration:none;font-weight:600;">${supportEmail}</a>
                ${supportPhone ? ` or <span style="color:#4A5A4A;">${supportPhone}</span>` : ''}
              </p>
              <p style="color:#9E9E9E;font-size:11px;margin:16px 0 0 0;">© ${currentYear} ${companyName}. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    textBody: `${title}\n\nHello ${userName},\n\n${body}\n\n${secondaryText || ''}\n\n— ${systemName} from ${companyName}\nSupport: ${supportEmail}`,
  };
};

// ============================================
// Auth Flow
// ============================================

export const getWelcomeEmail = async (userName) => {
  const { systemName, supportEmail } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: 'Welcome to the Quad! 🎉',
    body: `You are now part of the <strong>${systemName}</strong> — the official digital community of Rift Valley National Polytechnic. Connect with classmates, join groups, buy and sell on the marketplace, and stay updated with everything happening on campus.`,
    actionText: 'Complete Your Profile',
    actionUrl: '{{CLIENT_URL}}/profile',
    secondaryText: 'To get the most out of the platform, complete your profile, join your hostel community, and explore groups that match your interests.',
  });

  return { subject: `Welcome to ${systemName} 🎉`, ...result };
};

export const getVerificationCodeEmail = async (userName, verificationLink) => {
  const { systemName } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: 'Verify Your Email',
    body: `Click the button below to verify your email address and activate your <strong>${systemName}</strong> account.`,
    actionText: 'Verify Email',
    actionUrl: verificationLink,
    secondaryText: 'This link expires in 15 minutes. If you did not create an account, please ignore this email.',
  });

  return { subject: `Verify your email — ${systemName}`, ...result };
};

export const getPasswordResetEmail = async (userName, resetLink) => {
  const { systemName } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: 'Reset Your Password',
    body: 'You requested a password reset for your account. Click the button below to create a new password.',
    actionText: 'Reset Password',
    actionUrl: resetLink,
    secondaryText: 'This link expires in 1 hour. If you did not request a password reset, please ignore this email or contact support.',
  });

  return { subject: `Reset your password — ${systemName}`, ...result };
};

export const getPasswordChangedEmail = async (userName) => {
  const { systemName } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: 'Password Changed',
    body: 'Your password was successfully changed. If you made this change, no further action is needed.',
    secondaryText: 'If you did not change your password, please contact support immediately.',
  });

  return { subject: `Password changed — ${systemName}`, ...result };
};

// ============================================
// HDM Verification
// ============================================

export const getVerificationApplicationReceivedEmail = async (userName) => {
  const { systemName } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: 'HDM Verification — Application Received',
    body: `Your application for the <strong style="color:#1565C0;">HDM Verified</strong> blue tick has been received. Our team will review your submission and get back to you within 24 hours.`,
    secondaryText: 'You will be notified via email and in-app notification once a decision is made.',
  });

  return { subject: `HDM Verification — Application Received`, ...result };
};

export const getVerificationApprovedEmail = async (userName) => {
  const { systemName } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: 'You Are Now HDM Verified! 🏆',
    body: `Congratulations! You have been granted the <strong style="color:#1565C0;">HDM Verified</strong> blue tick. Your profile now carries the mark of trust and prestige across the entire <strong>${systemName}</strong> platform.`,
    actionText: 'View Your Profile',
    actionUrl: '{{CLIENT_URL}}/profile',
    secondaryText: 'Enjoy enhanced visibility, priority support, and exclusive access to verified-only features.',
  });

  return { subject: `You are now HDM Verified! 🏆`, ...result };
};

export const getVerificationRejectedEmail = async (userName, reason) => {
  const { systemName, supportEmail } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: 'HDM Verification — Update',
    body: `We were unable to grant you the <strong style="color:#1565C0;">HDM Verified</strong> badge at this time.`,
    secondaryText: `Reason: ${reason || 'Does not meet current criteria.'}\n\nYou may reapply after 30 days. Contact ${supportEmail} if you have questions.`,
  });

  return { subject: `HDM Verification — Update`, ...result };
};

// ============================================
// Awards & Recognition
// ============================================

export const getBadgeEarnedEmail = async (userName, badgeName, badgeEmoji, badgeDescription) => {
  const { systemName } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: `${badgeEmoji} Badge Earned!`,
    body: `You have earned the <strong>${badgeName}</strong> badge on <strong>${systemName}</strong>. ${badgeDescription}`,
    actionText: 'View Your Badges',
    actionUrl: '{{CLIENT_URL}}/profile/badges',
    secondaryText: 'Keep contributing to earn more badges and climb the leaderboard.',
  });

  return { subject: `${badgeEmoji} You earned: ${badgeName}`, ...result };
};

export const getWeeklyDigestEmail = async (userName, stats, badges, leaderboardPosition) => {
  const { systemName, supportEmail } = await getBranding();

  const badgesHtml = badges && badges.length > 0
    ? `<p style="color:#4A5A4A;font-size:15px;margin:20px 0 8px 0;"><strong>Badges Earned:</strong></p>
       <ul style="color:#4A5A4A;font-size:14px;padding-left:20px;">${badges.map(b => `<li>${b.emoji} ${b.name}</li>`).join('')}</ul>`
    : '';

  const result = await baseTemplate({
    userName,
    title: 'Your Weekly Digest',
    body: `
      <p style="color:#4A5A4A;font-size:15px;margin:0 0 16px 0;">Here is your activity summary on <strong>${systemName}</strong> this week:</p>
      <table width="100%" cellpadding="12" style="background-color:#F5F5F0;border-radius:12px;">
        <tr><td style="color:#4A5A4A;font-size:14px;">📰 Posts</td><td style="color:#212121;font-weight:700;text-align:right;">${stats.posts || 0}</td></tr>
        <tr><td style="color:#4A5A4A;font-size:14px;">💬 Comments</td><td style="color:#212121;font-weight:700;text-align:right;">${stats.comments || 0}</td></tr>
        <tr><td style="color:#4A5A4A;font-size:14px;">❤️ Likes Received</td><td style="color:#212121;font-weight:700;text-align:right;">${stats.likesReceived || 0}</td></tr>
        <tr><td style="color:#4A5A4A;font-size:14px;">🛒 Items Sold</td><td style="color:#212121;font-weight:700;text-align:right;">${stats.itemsSold || 0}</td></tr>
        <tr><td style="color:#1B5E20;font-size:14px;font-weight:700;">🏆 Leaderboard</td><td style="color:#1B5E20;font-weight:700;text-align:right;">#${leaderboardPosition || '—'}</td></tr>
      </table>
      ${badgesHtml}`,
    actionText: 'View Full Leaderboard',
    actionUrl: '{{CLIENT_URL}}/leaderboard',
    secondaryText: 'Thank you for being an active member of the community.',
  });

  return { subject: `Your weekly digest — ${systemName}`, ...result };
};

export const getSpotlightFeaturedEmail = async (userName, postPreview) => {
  const { systemName } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: '🌟 You Are in the HDM Spotlight!',
    body: `Your post has been hand-picked by the HDM team and is now featured in the <strong>HDM Spotlight</strong> section for the entire campus to see. Congratulations on creating exceptional content!`,
    actionText: 'See Your Spotlight',
    actionUrl: '{{CLIENT_URL}}/posts/spotlight',
    secondaryText: postPreview ? `Featured post: "${postPreview}"` : 'Your post will be highlighted for 7 days.',
  });

  return { subject: `🌟 You are in the HDM Spotlight!`, ...result };
};

// ============================================
// Support Flow
// ============================================

export const getTicketCreatedEmail = async (userName, ticketId, ticketSubject, message) => {
  const { systemName } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: 'Support Ticket Created',
    body: `Your support ticket <strong>#${ticketId}</strong> has been received. Our team will review and respond as soon as possible.`,
    secondaryText: `Subject: ${ticketSubject}\n\nWe aim to respond within 24 hours.`,
  });

  return { subject: `Support ticket #${ticketId} created — ${systemName}`, ...result };
};

export const getTicketResponseEmail = async (userName, ticketId, response) => {
  const { systemName } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: `Response to Ticket #${ticketId}`,
    body: `You have a new response on your support ticket:`,
    actionText: 'View Ticket',
    actionUrl: `{{CLIENT_URL}}/support/${ticketId}`,
    secondaryText: response ? `"${response.substring(0, 200)}${response.length > 200 ? '...' : ''}"` : '',
  });

  return { subject: `Response to ticket #${ticketId} — ${systemName}`, ...result };
};

export const getTicketResolvedEmail = async (userName, ticketId) => {
  const { systemName } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: 'Ticket Resolved',
    body: `Your support ticket <strong>#${ticketId}</strong> has been marked as resolved. If you feel this was done in error, you can reopen it from the app.`,
    secondaryText: 'We hope we were able to help. Your feedback helps us improve.',
  });

  return { subject: `Ticket #${ticketId} resolved — ${systemName}`, ...result };
};

// ============================================
// Moderation & Warnings
// ============================================

export const getContentWarningEmail = async (userName, contentPreview, reason) => {
  const { systemName, supportEmail } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: 'Content Warning',
    body: `Your content on <strong>${systemName}</strong> has been flagged and removed for violating our community guidelines.`,
    secondaryText: `Reason: ${reason}\nRemoved content: "${contentPreview}"\n\nRepeated violations may lead to account suspension. Contact ${supportEmail} if you believe this was a mistake.`,
  });

  return { subject: `Content warning — ${systemName}`, ...result };
};

export const getAccountSuspendedEmail = async (userName, reason, duration) => {
  const { systemName, supportEmail } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: 'Account Suspended',
    body: `Your account on <strong>${systemName}</strong> has been temporarily suspended.`,
    secondaryText: `Reason: ${reason}\nDuration: ${duration}\n\nContact ${supportEmail} to appeal this decision.`,
  });

  return { subject: `Account suspended — ${systemName}`, ...result };
};

export const getAccountBannedEmail = async (userName, reason) => {
  const { systemName, supportEmail } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: 'Account Banned',
    body: `Your account on <strong>${systemName}</strong> has been permanently banned due to serious or repeated violations.`,
    secondaryText: `Reason: ${reason}\n\nYou may contact ${supportEmail} to appeal within 30 days.`,
  });

  return { subject: `Account banned — ${systemName}`, ...result };
};

// ============================================
// Social & Engagement
// ============================================

export const getOfflineMessageDigestEmail = async (userName, unreadCount, previews) => {
  const { systemName } = await getBranding();

  const previewsHtml = previews && previews.length > 0
    ? previews.map(p => `<p style="color:#4A5A4A;font-size:13px;margin:0 0 6px 0;"><strong style="color:#212121;">${p.senderName}:</strong> ${p.preview}</p>`).join('')
    : '';

  const result = await baseTemplate({
    userName,
    title: `You Have ${unreadCount} Unread Message${unreadCount > 1 ? 's' : ''}`,
    body: `While you were away, you received ${unreadCount} new message${unreadCount > 1 ? 's' : ''} on <strong>${systemName}</strong>.`,
    actionText: 'Open Chats',
    actionUrl: '{{CLIENT_URL}}/chats',
  });

  if (previewsHtml) {
    result.htmlBody = result.htmlBody.replace('${actionButton}', `
      <div style="background-color:#F5F5F0;border-radius:12px;padding:16px;margin:0 0 20px 0;">
        ${previewsHtml}
      </div>
      ${result.htmlBody.match(/<a href.*?class="button".*?<\/a>/)?.[0] || ''}`);
  }

  return { subject: `${unreadCount} new message${unreadCount > 1 ? 's' : ''} — ${systemName}`, ...result };
};

export const getEventReminderEmail = async (userName, eventName, location, time) => {
  const { systemName } = await getBranding();

  const result = await baseTemplate({
    userName,
    title: '⏰ Event Reminder',
    body: `This is a reminder that <strong>${eventName}</strong> is coming up soon.`,
    secondaryText: `📍 Location: ${location}\n🕐 Time: ${time}\n\nDon't miss out!`,
  });

  return { subject: `⏰ Reminder: ${eventName} — ${systemName}`, ...result };
};

// ============================================
// Marketplace
// ============================================

export const getListingInterestEmail = async (sellerName, buyerName, listingTitle, listingId) => {
  const { systemName } = await getBranding();

  const result = await baseTemplate({
    userName: sellerName,
    title: 'Someone is Interested! 🛒',
    body: `<strong>${buyerName}</strong> is interested in your listing <strong>"${listingTitle}"</strong>. Open the app to connect with them.`,
    actionText: 'View Listing',
    actionUrl: `{{CLIENT_URL}}/market/${listingId}`,
    secondaryText: 'Respond quickly — interested buyers move fast!',
  });

  return { subject: `${buyerName} is interested in your listing — ${systemName}`, ...result };
};

export const getListingSoldEmail = async (sellerName, listingTitle, price) => {
  const { systemName } = await getBranding();

  const result = await baseTemplate({
    userName: sellerName,
    title: 'Item Sold! 🎉',
    body: `Your listing <strong>"${listingTitle}"</strong> has been marked as sold for <strong>KSh ${price.toLocaleString()}</strong>.`,
    secondaryText: 'Thank you for using the RVNP marketplace. List more items and earn your Marketplace Champion badge!',
  });

  return { subject: `Sold: ${listingTitle} — KSh ${price.toLocaleString()}`, ...result };
};

// ============================================
// Admin Announcements
// ============================================

export const getAnnouncementEmail = async (userName, title, body, imageUrl) => {
  const { systemName } = await getBranding();

  const imageHtml = imageUrl
    ? `<img src="${imageUrl}" alt="Announcement" style="width:100%;max-width:520px;border-radius:12px;margin:0 0 20px 0;">`
    : '';

  const result = await baseTemplate({
    userName,
    title,
    body: `${imageHtml}${body}`,
    secondaryText: `This is an official announcement from ${systemName}.`,
  });

  return { subject: `📢 ${title} — ${systemName}`, ...result };
};