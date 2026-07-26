import Badge from '../../models/user/Badge.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import getSettings from '../../utils/getSettings.js';
import logger from '../../utils/logger.js';

// GET /api/badges
const getMyBadges = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.leaderboard) throw new AppError('Leaderboard is currently disabled', 403, 'LEADERBOARD_DISABLED');
    const badges = await Badge.find({ user: req.user._id, isActive: true }).sort({ awardedAt: -1 });
    return success(res, badges, 'My badges');
  } catch (error) {
    next(error);
  }
};

// GET /api/badges/:id
const getBadgeById = async (req, res, next) => {
  try {
    const badge = await Badge.findById(req.params.id);
    if (!badge) throw new AppError('Badge not found', 404, 'NOT_FOUND');
    return success(res, badge, 'Badge detail');
  } catch (error) {
    next(error);
  }
};

// GET /api/badges/progress
const getBadgeProgress = async (req, res, next) => {
  try {
    const settings = await getSettings();
    const user = (await import('../../models/user/User.js')).default.findById(req.user._id);
    const Post = (await import('../../models/user/Post.js')).default;
    const Listing = (await import('../../models/user/Listing.js')).default;
    const Story = (await import('../../models/user/Story.js')).default;

    const postCount = await Post.countDocuments({ author: req.user._id });
    const listingSold = await Listing.countDocuments({ seller: req.user._id, status: 'sold' });
    const lostFoundReturned = await Post.countDocuments({ author: req.user._id, type: 'lost_found', status: 'claimed' });
    const storyDays = await Story.distinct('createdAt', { author: req.user._id });

    return success(res, {
      topContributor: { current: req.user.contributionScore?.weekly || 0, next: 100 },
      marketplaceChampion: { current: listingSold, needed: settings?.badges?.marketplaceChampionSales || 10 },
      storyStar: { current: new Set(storyDays.map(d => d.toISOString().split('T')[0])).size, needed: settings?.badges?.storyStarDays || 7 },
      lostFoundHero: { current: lostFoundReturned, needed: settings?.badges?.lostFoundHeroReturns || 3 },
    }, 'Badge progress');
  } catch (error) {
    next(error);
  }
};

export { getMyBadges, getBadgeById, getBadgeProgress };