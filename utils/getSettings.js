import Settings from '../models/admin/Settings.js';
import logger from './logger.js';

let cachedSettings = null;
let lastFetched = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const defaultSettings = {
  general: {
    systemName: 'RVNP Campus Hub',
    tagline: 'The Digital Quad of Rift Valley National Polytechnic',
    supportEmail: 'support@hdm.com',
    supportPhone: '',
    language: 'en',
    timezone: 'Africa/Nairobi',
    dateFormat: 'DD/MM/YYYY',
    logo: '',
    favicon: '',
  },
  ai: {
    apiUrl: process.env.HDM_AI_API_URL || '',
    modelVersion: 'v2.1',
    moderationSensitivity: 0.75,
    autoFlagThreshold: 0.3,
    smartFeedEnabled: true,
    suggestedRepliesEnabled: true,
    verificationScanEnabled: true,
  },
  email: {
    senderName: 'RVNP Campus Hub',
    senderEmail: process.env.HDM_BRIDGE_FROM_EMAIL || 'notifications@theirdomain.com',
    templates: {},
  },
  sms: {
    senderId: 'HDM',
    templates: {},
    timeRestrictionEnabled: true,
  },
  legals: {
    termsOfService: '',
    privacyPolicy: '',
    communityGuidelines: '',
    marketplacePolicy: '',
    lastUpdated: new Date(),
    requireReaccept: false,
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
  toggles: {
    userRegistration: true,
    posts: true,
    stories: true,
    chat: true,
    groups: true,
    marketplace: true,
    verification: true,
    leaderboard: true,
    maintenanceMode: false,
    betaFeatures: false,
  },
  downloads: {
    playStoreUrl: '',
    appStoreUrl: '',
    apkUrl: '',
    downloadPageEnabled: false,
    minAppVersion: '1.0.0',
    updateMessage: 'A new version is available.',
  },
  backups: {
    schedule: 'daily',
    time: '03:00',
    retentionCount: 7,
    storageLocation: '',
    lastBackupDate: null,
    lastBackupStatus: null,
  },
  pricing: {
    verificationFeeKsh: 200,
    renewalEnabled: false,
    discountCodes: [],
  },
  badges: {
    topContributorWeeklyCount: 10,
    topContributorMonthlyCount: 20,
    topFanThreshold: 30,
    marketplaceChampionSales: 10,
    marketplaceChampionRating: 4.5,
    storyStarDays: 7,
    groupBuilderMembers: 50,
    lostFoundHeroReturns: 3,
    qaExpertAnswers: 10,
    earlyAdopterThreshold: 1000,
  },
  scoring: {
    post: 3,
    comment: 1,
    helpfulAnswer: 5,
    listingSold: 4,
    lostFoundReturned: 10,
    groupFileUpload: 2,
    storyPosted: 1,
    repost: 2,
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
    postsPerPage: 20,
    chatsPerPage: 30,
    marketPerPage: 20,
    usersPerPage: 50,
    notificationsPerPage: 30,
  },
  jobs: {
    weeklyAwards: '0 8 * * 1',
    monthlyAwards: '0 8 1 * *',
    storyCleanup: '0 * * * *',
    feedRanking: '*/30 * * * *',
  },
};

const getSettings = async () => {
  if (cachedSettings && lastFetched && (Date.now() - lastFetched) < CACHE_TTL) {
    return cachedSettings;
  }

  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(defaultSettings);
      logger.info('Default settings created');
    }

    cachedSettings = settings;
    lastFetched = Date.now();
    return cachedSettings;
  } catch (error) {
    logger.error('Failed to load settings, using defaults:', error.message);
    return defaultSettings;
  }
};

const getSetting = async (key) => {
  const settings = await getSettings();
  const keys = key.split('.');
  let value = settings;

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return undefined;
    }
  }

  return value;
};

const refreshCache = () => {
  cachedSettings = null;
  lastFetched = null;
  logger.info('Settings cache cleared');
};

export default getSettings;
export { getSetting, refreshCache };