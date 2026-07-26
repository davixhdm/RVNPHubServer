import Settings from '../../models/admin/Settings.js';
import { success } from '../../utils/responseHandler.js';

// GET /api/legal/terms
const getTermsOfService = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    return success(res, {
      content: settings?.legals?.termsOfService || 'Terms of Service not yet configured.',
      lastUpdated: settings?.legals?.lastUpdated || new Date(),
    }, 'Terms of Service');
  } catch (error) {
    next(error);
  }
};

// GET /api/legal/privacy
const getPrivacyPolicy = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    return success(res, {
      content: settings?.legals?.privacyPolicy || 'Privacy Policy not yet configured.',
      lastUpdated: settings?.legals?.lastUpdated || new Date(),
    }, 'Privacy Policy');
  } catch (error) {
    next(error);
  }
};

// GET /api/legal/guidelines
const getCommunityGuidelines = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    return success(res, {
      content: settings?.legals?.communityGuidelines || 'Community Guidelines not yet configured.',
      lastUpdated: settings?.legals?.lastUpdated || new Date(),
    }, 'Community Guidelines');
  } catch (error) {
    next(error);
  }
};

// GET /api/legal/marketplace
const getMarketplacePolicy = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    return success(res, {
      content: settings?.legals?.marketplacePolicy || 'Marketplace Policy not yet configured.',
      lastUpdated: settings?.legals?.lastUpdated || new Date(),
    }, 'Marketplace Policy');
  } catch (error) {
    next(error);
  }
};

// GET /api/legal
const getAllLegals = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    return success(res, {
      termsOfService: settings?.legals?.termsOfService || '',
      privacyPolicy: settings?.legals?.privacyPolicy || '',
      communityGuidelines: settings?.legals?.communityGuidelines || '',
      marketplacePolicy: settings?.legals?.marketplacePolicy || '',
      lastUpdated: settings?.legals?.lastUpdated || new Date(),
      requireReaccept: settings?.legals?.requireReaccept || false,
    }, 'All legal documents');
  } catch (error) {
    next(error);
  }
};

export { getTermsOfService, getPrivacyPolicy, getCommunityGuidelines, getMarketplacePolicy, getAllLegals };