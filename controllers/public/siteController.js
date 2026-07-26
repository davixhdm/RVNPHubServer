import Settings from '../../models/admin/Settings.js';
import { success } from '../../utils/responseHandler.js';

// GET /api/site/config
const getSiteConfig = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return success(res, {
        systemName: 'RVNP Campus Hub',
        tagline: 'The Digital Quad of Rift Valley National Polytechnic',
        logo: '',
        favicon: '',
        language: 'en',
        timezone: 'Africa/Nairobi',
        dateFormat: 'DD/MM/YYYY',
        supportEmail: 'support@hdm.com',
        supportPhone: '',
        downloads: {
          playStoreUrl: '',
          appStoreUrl: '',
          apkUrl: '',
          downloadPageEnabled: false,
          minAppVersion: '1.0.0',
          updateMessage: 'A new version is available.',
        },
        uploads: {
          maxFileSizeMB: 20,
          allowedTypes: ['jpg', 'png', 'gif', 'mp4', 'pdf'],
          maxPostImages: 5,
          maxMarketImages: 4,
          maxAvatarSizeMB: 2,
          maxStorySizeMB: 15,
          maxChatFileSizeMB: 25,
        },
        limits: {
          postMaxChars: 2000,
          commentMaxChars: 500,
          listingTitleMaxChars: 100,
          listingDescriptionMaxChars: 1000,
          groupNameMaxChars: 50,
          groupDescriptionMaxChars: 500,
          chatMessageMaxChars: 2000,
          storyCaptionMaxChars: 200,
        },
      }, 'Default config');
    }

    return success(res, {
      systemName: settings.general?.systemName || 'RVNP Campus Hub',
      tagline: settings.general?.tagline || 'The Digital Quad of Rift Valley National Polytechnic',
      logo: settings.general?.logo || '',
      favicon: settings.general?.favicon || '',
      language: settings.general?.language || 'en',
      timezone: settings.general?.timezone || 'Africa/Nairobi',
      dateFormat: settings.general?.dateFormat || 'DD/MM/YYYY',
      supportEmail: settings.general?.supportEmail || 'support@hdm.com',
      supportPhone: settings.general?.supportPhone || '',
      downloads: settings.downloads || {},
      uploads: settings.uploads || {},
      limits: settings.limits || {},
    }, 'Site config');
  } catch (error) {
    next(error);
  }
};

// GET /api/site/toggles
const getToggles = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return success(res, {
        userRegistration: true,
        posts: true,
        stories: true,
        chat: true,
        groups: true,
        marketplace: true,
        verification: true,
        leaderboard: true,
        live: true,
        maintenanceMode: false,
        betaFeatures: false,
        ai: {
          aiEnabled: true,
          chatEnabled: true,
          moderationEnabled: true,
          smartFeedEnabled: true,
          suggestedRepliesEnabled: true,
          trendingEnabled: true,
        },
      }, 'Default toggles');
    }

    return success(res, {
      userRegistration: settings.toggles?.userRegistration ?? true,
      posts: settings.toggles?.posts ?? true,
      stories: settings.toggles?.stories ?? true,
      chat: settings.toggles?.chat ?? true,
      groups: settings.toggles?.groups ?? true,
      marketplace: settings.toggles?.marketplace ?? true,
      verification: settings.toggles?.verification ?? true,
      leaderboard: settings.toggles?.leaderboard ?? true,
      live: settings.toggles?.live ?? true,
      maintenanceMode: settings.toggles?.maintenanceMode ?? false,
      betaFeatures: settings.toggles?.betaFeatures ?? false,
      ai: {
        aiEnabled: settings.ai?.aiEnabled ?? true,
        chatEnabled: settings.ai?.chatEnabled ?? true,
        moderationEnabled: settings.ai?.moderationEnabled ?? true,
        smartFeedEnabled: settings.ai?.smartFeedEnabled ?? true,
        suggestedRepliesEnabled: settings.ai?.suggestedRepliesEnabled ?? true,
        trendingEnabled: settings.ai?.trendingEnabled ?? true,
      },
    }, 'Feature toggles');
  } catch (error) {
    next(error);
  }
};

// GET /api/site/downloads
const getDownloads = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return success(res, {
        playStoreUrl: '',
        appStoreUrl: '',
        apkUrl: '',
        downloadPageEnabled: false,
        minAppVersion: '1.0.0',
        updateMessage: 'A new version is available.',
      }, 'Default downloads');
    }

    return success(res, settings.downloads, 'Download links');
  } catch (error) {
    next(error);
  }
};

// GET /api/site/contact
const getContactInfo = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return success(res, {
        supportEmail: 'support@hdm.com',
        supportPhone: '',
        systemName: 'RVNP Campus Hub',
      }, 'Default contact');
    }

    return success(res, {
      supportEmail: settings.general?.supportEmail || 'support@hdm.com',
      supportPhone: settings.general?.supportPhone || '',
      systemName: settings.general?.systemName || 'RVNP Campus Hub',
    }, 'Contact info');
  } catch (error) {
    next(error);
  }
};

// GET /api/site/maintenance
const getMaintenanceStatus = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return success(res, {
        maintenanceMode: false,
        message: '',
      }, 'No maintenance');
    }

    return success(res, {
      maintenanceMode: settings.toggles?.maintenanceMode ?? false,
      message: settings.general?.maintenanceMessage || 'Under maintenance. We will be back shortly.',
    }, 'Maintenance status');
  } catch (error) {
    next(error);
  }
};

export {
  getSiteConfig,
  getToggles,
  getDownloads,
  getContactInfo,
  getMaintenanceStatus,
};