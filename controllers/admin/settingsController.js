import Settings from '../../models/admin/Settings.js';
import sendEmail from '../../config/hdmBridge.js';
import sendSMS from '../../config/brevo.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import { refreshCache } from '../../utils/getSettings.js';
import logger from '../../utils/logger.js';

// GET /api/admin/settings
const getAllSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    return success(res, settings, 'All settings');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/settings/general
const updateGeneral = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    settings.general = {
      systemName: req.body.systemName ?? settings.general.systemName ?? 'RVNP Campus Hub',
      tagline: req.body.tagline ?? settings.general.tagline ?? 'The Digital Quad of Rift Valley National Polytechnic',
      supportEmail: req.body.supportEmail ?? settings.general.supportEmail ?? 'support@hdm.com',
      supportPhone: req.body.supportPhone ?? settings.general.supportPhone ?? '',
      language: req.body.language ?? settings.general.language ?? 'en',
      timezone: req.body.timezone ?? settings.general.timezone ?? 'Africa/Nairobi',
      dateFormat: req.body.dateFormat ?? settings.general.dateFormat ?? 'DD/MM/YYYY',
      logo: req.body.logo ?? settings.general.logo ?? '',
      favicon: req.body.favicon ?? settings.general.favicon ?? '',
      maintenanceMessage: req.body.maintenanceMessage ?? settings.general.maintenanceMessage ?? 'Under maintenance. We will be back shortly.',
    };
    await settings.save();
    refreshCache();
    logger.info(`General settings updated by admin ${req.admin._id}`);
    return success(res, settings.general, 'General settings updated');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/settings/ai
const updateAI = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    settings.ai = {
      aiEnabled: req.body.aiEnabled ?? settings.ai.aiEnabled ?? true,
      chatEnabled: req.body.chatEnabled ?? settings.ai.chatEnabled ?? true,
      moderationEnabled: req.body.moderationEnabled ?? settings.ai.moderationEnabled ?? true,
      moderationSensitivity: req.body.moderationSensitivity ?? settings.ai.moderationSensitivity ?? 0.75,
      autoFlagThreshold: req.body.autoFlagThreshold ?? settings.ai.autoFlagThreshold ?? 0.3,
      verificationScanEnabled: req.body.verificationScanEnabled ?? settings.ai.verificationScanEnabled ?? true,
      smartFeedEnabled: req.body.smartFeedEnabled ?? settings.ai.smartFeedEnabled ?? true,
      suggestedRepliesEnabled: req.body.suggestedRepliesEnabled ?? settings.ai.suggestedRepliesEnabled ?? true,
      trendingEnabled: req.body.trendingEnabled ?? settings.ai.trendingEnabled ?? true,
      modelVersion: req.body.modelVersion ?? settings.ai.modelVersion ?? 'v2.1',
    };
    await settings.save();
    refreshCache();
    return success(res, settings.ai, 'AI settings updated');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/settings/email
const updateEmail = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    settings.email = {
      senderName: req.body.senderName ?? settings.email.senderName ?? 'RVNP Campus Hub',
      senderEmail: req.body.senderEmail ?? settings.email.senderEmail ?? '',
      templates: req.body.templates ?? settings.email.templates ?? {},
    };
    await settings.save();
    refreshCache();
    return success(res, settings.email, 'Email settings updated');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/settings/email/test
const testEmail = async (req, res, next) => {
  try {
    const { to } = req.body;
    if (!to) throw new AppError('Recipient email required', 400, 'MISSING_EMAIL');

    const settings = await Settings.findOne();
    const result = await sendEmail({
      to,
      subject: `Test Email — ${settings.general.systemName}`,
      htmlBody: `<h2>Test Email</h2><p>This is a test email from ${settings.general.systemName}.</p><p>Email configuration is working correctly.</p>`,
      textBody: `Test Email from ${settings.general.systemName}. Email configuration is working correctly.`,
    });

    if (result.success) return success(res, null, 'Test email sent successfully');
    throw new AppError('Failed to send test email', 500, 'EMAIL_FAILED');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/settings/sms
const updateSMS = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    settings.sms = {
      senderId: req.body.senderId ?? settings.sms.senderId ?? 'HDM',
      templates: req.body.templates ?? settings.sms.templates ?? {},
      timeRestrictionEnabled: req.body.timeRestrictionEnabled ?? settings.sms.timeRestrictionEnabled ?? true,
    };
    await settings.save();
    refreshCache();
    return success(res, settings.sms, 'SMS settings updated');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/settings/sms/test
const testSMS = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) throw new AppError('Phone number required', 400, 'MISSING_PHONE');

    const settings = await Settings.findOne();
    const result = await sendSMS({ phone, body: `Test SMS from ${settings.general.systemName}. SMS configuration is working.` });

    if (result.success) return success(res, null, 'Test SMS sent successfully');
    throw new AppError('Failed to send test SMS', 500, 'SMS_FAILED');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/settings/legals
const updateLegals = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    settings.legals = {
      termsOfService: req.body.termsOfService ?? settings.legals.termsOfService ?? '',
      privacyPolicy: req.body.privacyPolicy ?? settings.legals.privacyPolicy ?? '',
      communityGuidelines: req.body.communityGuidelines ?? settings.legals.communityGuidelines ?? '',
      marketplacePolicy: req.body.marketplacePolicy ?? settings.legals.marketplacePolicy ?? '',
      lastUpdated: new Date(),
      requireReaccept: req.body.requireReaccept ?? settings.legals.requireReaccept ?? false,
    };
    await settings.save();
    refreshCache();
    return success(res, settings.legals, 'Legal documents updated');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/settings/uploads
const updateUploads = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    settings.uploads = {
      maxFileSizeMB: req.body.maxFileSizeMB ?? settings.uploads.maxFileSizeMB ?? 20,
      allowedTypes: req.body.allowedTypes ?? settings.uploads.allowedTypes ?? ['jpg', 'png', 'gif', 'mp4', 'pdf'],
      maxPostImages: req.body.maxPostImages ?? settings.uploads.maxPostImages ?? 5,
      maxMarketImages: req.body.maxMarketImages ?? settings.uploads.maxMarketImages ?? 4,
      maxAvatarSizeMB: req.body.maxAvatarSizeMB ?? settings.uploads.maxAvatarSizeMB ?? 2,
      maxStorySizeMB: req.body.maxStorySizeMB ?? settings.uploads.maxStorySizeMB ?? 15,
      maxChatFileSizeMB: req.body.maxChatFileSizeMB ?? settings.uploads.maxChatFileSizeMB ?? 25,
    };
    await settings.save();
    refreshCache();
    return success(res, settings.uploads, 'Upload settings updated');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/settings/toggles
const updateToggles = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    settings.toggles = {
      userRegistration: req.body.userRegistration ?? settings.toggles.userRegistration ?? true,
      posts: req.body.posts ?? settings.toggles.posts ?? true,
      stories: req.body.stories ?? settings.toggles.stories ?? true,
      chat: req.body.chat ?? settings.toggles.chat ?? true,
      groups: req.body.groups ?? settings.toggles.groups ?? true,
      marketplace: req.body.marketplace ?? settings.toggles.marketplace ?? true,
      verification: req.body.verification ?? settings.toggles.verification ?? true,
      leaderboard: req.body.leaderboard ?? settings.toggles.leaderboard ?? true,
      live: req.body.live ?? settings.toggles.live ?? true,
      maintenanceMode: req.body.maintenanceMode ?? settings.toggles.maintenanceMode ?? false,
      betaFeatures: req.body.betaFeatures ?? settings.toggles.betaFeatures ?? false,
    };
    await settings.save();
    refreshCache();
    logger.info(`Toggles updated by admin ${req.admin._id}`);
    return success(res, settings.toggles, 'Feature toggles updated');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/settings/downloads
const updateDownloads = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    settings.downloads = {
      playStoreUrl: req.body.playStoreUrl ?? settings.downloads.playStoreUrl ?? '',
      appStoreUrl: req.body.appStoreUrl ?? settings.downloads.appStoreUrl ?? '',
      apkUrl: req.body.apkUrl ?? settings.downloads.apkUrl ?? '',
      downloadPageEnabled: req.body.downloadPageEnabled ?? settings.downloads.downloadPageEnabled ?? false,
      minAppVersion: req.body.minAppVersion ?? settings.downloads.minAppVersion ?? '1.0.0',
      updateMessage: req.body.updateMessage ?? settings.downloads.updateMessage ?? 'A new version is available.',
    };
    await settings.save();
    refreshCache();
    return success(res, settings.downloads, 'Download settings updated');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/settings/badges
const updateBadges = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    settings.badges = {
      topContributorWeeklyCount: req.body.topContributorWeeklyCount ?? settings.badges.topContributorWeeklyCount ?? 10,
      topContributorMonthlyCount: req.body.topContributorMonthlyCount ?? settings.badges.topContributorMonthlyCount ?? 20,
      topFanThreshold: req.body.topFanThreshold ?? settings.badges.topFanThreshold ?? 30,
      marketplaceChampionSales: req.body.marketplaceChampionSales ?? settings.badges.marketplaceChampionSales ?? 10,
      marketplaceChampionRating: req.body.marketplaceChampionRating ?? settings.badges.marketplaceChampionRating ?? 4.5,
      storyStarDays: req.body.storyStarDays ?? settings.badges.storyStarDays ?? 7,
      groupBuilderMembers: req.body.groupBuilderMembers ?? settings.badges.groupBuilderMembers ?? 50,
      lostFoundHeroReturns: req.body.lostFoundHeroReturns ?? settings.badges.lostFoundHeroReturns ?? 3,
      qaExpertAnswers: req.body.qaExpertAnswers ?? settings.badges.qaExpertAnswers ?? 10,
      earlyAdopterThreshold: req.body.earlyAdopterThreshold ?? settings.badges.earlyAdopterThreshold ?? 1000,
    };
    await settings.save();
    refreshCache();
    return success(res, settings.badges, 'Badge settings updated');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/settings/scoring
const updateScoring = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    settings.scoring = {
      post: req.body.post ?? settings.scoring.post ?? 3,
      comment: req.body.comment ?? settings.scoring.comment ?? 1,
      helpfulAnswer: req.body.helpfulAnswer ?? settings.scoring.helpfulAnswer ?? 5,
      listingSold: req.body.listingSold ?? settings.scoring.listingSold ?? 4,
      lostFoundReturned: req.body.lostFoundReturned ?? settings.scoring.lostFoundReturned ?? 10,
      groupFileUpload: req.body.groupFileUpload ?? settings.scoring.groupFileUpload ?? 2,
      storyPosted: req.body.storyPosted ?? settings.scoring.storyPosted ?? 1,
      repost: req.body.repost ?? settings.scoring.repost ?? 2,
    };
    await settings.save();
    refreshCache();
    return success(res, settings.scoring, 'Scoring settings updated');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/settings/limits
const updateLimits = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    settings.limits = {
      postMaxChars: req.body.postMaxChars ?? settings.limits.postMaxChars ?? 2000,
      commentMaxChars: req.body.commentMaxChars ?? settings.limits.commentMaxChars ?? 500,
      listingTitleMaxChars: req.body.listingTitleMaxChars ?? settings.limits.listingTitleMaxChars ?? 100,
      listingDescriptionMaxChars: req.body.listingDescriptionMaxChars ?? settings.limits.listingDescriptionMaxChars ?? 1000,
      groupNameMaxChars: req.body.groupNameMaxChars ?? settings.limits.groupNameMaxChars ?? 50,
      groupDescriptionMaxChars: req.body.groupDescriptionMaxChars ?? settings.limits.groupDescriptionMaxChars ?? 500,
      chatMessageMaxChars: req.body.chatMessageMaxChars ?? settings.limits.chatMessageMaxChars ?? 2000,
      storyCaptionMaxChars: req.body.storyCaptionMaxChars ?? settings.limits.storyCaptionMaxChars ?? 200,
      postsPerPage: req.body.postsPerPage ?? settings.limits.postsPerPage ?? 20,
      chatsPerPage: req.body.chatsPerPage ?? settings.limits.chatsPerPage ?? 30,
      marketPerPage: req.body.marketPerPage ?? settings.limits.marketPerPage ?? 20,
      usersPerPage: req.body.usersPerPage ?? settings.limits.usersPerPage ?? 50,
      notificationsPerPage: req.body.notificationsPerPage ?? settings.limits.notificationsPerPage ?? 30,
    };
    await settings.save();
    refreshCache();
    return success(res, settings.limits, 'Limit settings updated');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/settings/jobs
const updateJobs = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    settings.jobs = {
      weeklyAwards: req.body.weeklyAwards ?? settings.jobs.weeklyAwards ?? '0 8 * * 1',
      monthlyAwards: req.body.monthlyAwards ?? settings.jobs.monthlyAwards ?? '0 8 1 * *',
      storyCleanup: req.body.storyCleanup ?? settings.jobs.storyCleanup ?? '0 * * * *',
      feedRanking: req.body.feedRanking ?? settings.jobs.feedRanking ?? '*/30 * * * *',
      checkSubscriptions: req.body.checkSubscriptions ?? settings.jobs.checkSubscriptions ?? '0 8 * * *',
    };
    await settings.save();
    refreshCache();
    return success(res, settings.jobs, 'Job schedule settings updated');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/settings/pricing
const updatePricing = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    settings.pricing = {
      verificationFeeKsh: req.body.verificationFeeKsh ?? settings.pricing.verificationFeeKsh ?? 200,
      renewalEnabled: req.body.renewalEnabled ?? settings.pricing.renewalEnabled ?? false,
      discountCodes: req.body.discountCodes ?? settings.pricing.discountCodes ?? [],
    };
    await settings.save();
    refreshCache();
    return success(res, settings.pricing, 'Pricing settings updated');
  } catch (error) {
    next(error);
  }
};

export {
  getAllSettings,
  updateGeneral,
  updateAI,
  updateEmail,
  testEmail,
  updateSMS,
  testSMS,
  updateLegals,
  updateUploads,
  updateToggles,
  updateDownloads,
  updateBadges,
  updateScoring,
  updateLimits,
  updateJobs,
  updatePricing,
};