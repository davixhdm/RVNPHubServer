import { moderateContent, scanVerificationDoc, getSuggestedReplies, rankFeedItems, detectTrendingTopics } from '../config/hdmAI.js';
import getSettings from '../utils/getSettings.js';
import logger from '../utils/logger.js';

const isAIEnabled = async () => {
  const settings = await getSettings();
  return settings?.ai?.aiEnabled !== false;
};

const isFeatureEnabled = async (feature) => {
  const settings = await getSettings();
  if (settings?.ai?.aiEnabled === false) return false;
  return settings?.ai?.[feature] !== false;
};

export const moderateText = async (text) => {
  try {
    if (!(await isFeatureEnabled('moderationEnabled'))) {
      return { flagged: false, reason: 'ai_disabled', confidence: 0, categories: {} };
    }

    const result = await moderateContent(text, null);
    return {
      flagged: result.flagged || false,
      reason: result.reason || null,
      confidence: result.confidence || 0,
      categories: result.categories || {},
    };
  } catch (error) {
    logger.error('moderateText failed:', error);
    return { flagged: false, reason: 'ai_error', confidence: 0, categories: {} };
  }
};

export const moderateImage = async (imageUrl) => {
  try {
    if (!(await isFeatureEnabled('moderationEnabled'))) {
      return { flagged: false, reason: 'ai_disabled', confidence: 0, categories: {} };
    }

    const result = await moderateContent(null, imageUrl);
    return {
      flagged: result.flagged || false,
      reason: result.reason || null,
      confidence: result.confidence || 0,
      categories: result.categories || {},
    };
  } catch (error) {
    logger.error('moderateImage failed:', error);
    return { flagged: false, reason: 'ai_error', confidence: 0, categories: {} };
  }
};

export const scanDocument = async (imageUrl) => {
  try {
    if (!(await isFeatureEnabled('verificationScanEnabled'))) {
      return { valid: false, reason: 'ai_disabled', confidence: 0, warnings: ['verification_scan_disabled'] };
    }

    const result = await scanVerificationDoc(imageUrl);
    return {
      valid: result.valid || false,
      extractedName: result.extractedName || null,
      extractedRegNo: result.extractedRegNo || null,
      confidence: result.confidence || 0,
      documentType: result.documentType || null,
      warnings: result.warnings || [],
    };
  } catch (error) {
    logger.error('scanDocument failed:', error);
    return { valid: false, reason: 'ai_error', confidence: 0, warnings: ['ai_error'] };
  }
};

export const suggestReplies = async (chatContext) => {
  try {
    if (!(await isFeatureEnabled('suggestedRepliesEnabled'))) {
      return [];
    }

    const result = await getSuggestedReplies(chatContext);
    return result.suggestions || [];
  } catch (error) {
    logger.error('suggestReplies failed:', error);
    return [];
  }
};

export const rankFeed = async (posts, userInterests, userDepartment, userHostel) => {
  try {
    if (!(await isFeatureEnabled('smartFeedEnabled'))) {
      return posts;
    }

    const result = await rankFeedItems(posts, userInterests, userDepartment, userHostel);
    return result.rankedPosts || posts;
  } catch (error) {
    logger.error('rankFeed failed:', error);
    return posts;
  }
};

export const getTrendingTopics = async (posts) => {
  try {
    if (!(await isFeatureEnabled('trendingEnabled'))) {
      return [];
    }

    const result = await detectTrendingTopics(posts);
    return result.topics || [];
  } catch (error) {
    logger.error('getTrendingTopics failed:', error);
    return [];
  }
};