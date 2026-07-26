import Post from '../models/user/Post.js';
import User from '../models/user/User.js';
import * as aiService from '../services/aiService.js';
import logger from '../utils/logger.js';

export const refreshFeedRankings = async () => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const activeUsers = await User.find({
      lastSeen: { $gte: twoHoursAgo },
      isBanned: false,
    }).select('_id interests department');

    if (activeUsers.length === 0) {
      logger.info('Feed ranking: No active users');
      return { feedsUpdated: 0 };
    }

    const recentPosts = await Post.find({
      createdAt: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
      status: 'active',
      moderationStatus: { $ne: 'removed' },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('author', 'firstName lastName avatar hdmVerified department');

    if (recentPosts.length === 0) {
      logger.info('Feed ranking: No recent posts');
      return { feedsUpdated: 0 };
    }

    let feedsUpdated = 0;

    for (const user of activeUsers) {
      try {
        const rankedPosts = await aiService.rankFeed(
          recentPosts.map(p => p.toObject()),
          user.interests || []
        );

        if (rankedPosts && rankedPosts !== recentPosts) {
          feedsUpdated++;
        }
      } catch {
        // Skip user if AI fails
      }
    }

    logger.info(`Feed ranking: ${feedsUpdated} feeds updated`);
    return { feedsUpdated };
  } catch (error) {
    logger.error('Feed ranking failed:', error);
    return { feedsUpdated: 0 };
  }
};