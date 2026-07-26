import Post from '../models/user/Post.js';
import paginate from '../utils/paginate.js';
import * as aiService from './aiService.js';
import logger from '../utils/logger.js';

export const getUserFeed = async (userId, tab = 'all', page = 1, user) => {
  try {
    const query = { status: 'active', moderationStatus: { $ne: 'removed' } };

    switch (tab) {
      case 'dept':
        query.category = 'dept';
        if (user?.department) query.department = user.department;
        break;
      case 'sports':
        query.category = 'sports';
        break;
      case 'projects':
        query.category = 'projects';
        break;
      case 'qna':
        query.category = 'qna';
        break;
      case 'trade':
        query.category = 'trade';
        break;
      case 'urgent':
        query.isUrgent = true;
        break;
    }

    const result = await paginate(Post, query, {
      page,
      limit: 20,
      sort: { isUrgent: -1, createdAt: -1 },
      populate: 'author',
    });

    // AI ranking for 'all' tab
    if (tab === 'all' && user?.interests?.length > 0) {
      const ranked = await aiService.rankFeed(result.data, user.interests);
      if (ranked.length > 0) result.data = ranked;
    }

    return result;
  } catch (error) {
    logger.error('getUserFeed failed:', error);
    return { data: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0 } };
  }
};

export const getTrendingPosts = async () => {
  try {
    const posts = await Post.find({ status: 'active', moderationStatus: { $ne: 'removed' } })
      .sort({ likeCount: -1, commentCount: -1 })
      .limit(20)
      .populate('author');

    return posts;
  } catch (error) {
    logger.error('getTrendingPosts failed:', error);
    return [];
  }
};