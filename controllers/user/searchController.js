import User from '../../models/user/User.js';
import Post from '../../models/user/Post.js';
import Group from '../../models/user/Group.js';
import Listing from '../../models/user/Listing.js';
import paginate from '../../utils/paginate.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

// GET /api/search
const searchAll = async (req, res, next) => {
  try {
    const { q, page } = req.query;
    if (!q) throw new AppError('Search query required', 400, 'MISSING_QUERY');
    const regex = { $regex: q, $options: 'i' };

    const [users, posts, groups, listings] = await Promise.all([
      User.find({ $or: [{ firstName: regex }, { lastName: regex }], isBanned: false }).limit(5).select('firstName lastName avatar department hdmVerified'),
      Post.find({ content: regex, status: 'active', moderationStatus: { $ne: 'removed' } }).limit(5).populate('author', 'firstName lastName avatar'),
      Group.find({ name: regex, isActive: true }).limit(5).select('name memberCount coverImage'),
      Listing.find({ title: regex, status: 'active' }).limit(5).select('title price images'),
    ]);

    return success(res, { users, posts, groups, listings }, 'Search results');
  } catch (error) {
    next(error);
  }
};

// GET /api/search/users
const searchUsers = async (req, res, next) => {
  try {
    const { q, page } = req.query;
    if (!q) throw new AppError('Search query required', 400, 'MISSING_QUERY');
    const regex = { $regex: q, $options: 'i' };
    const result = await paginate(User, { $or: [{ firstName: regex }, { lastName: regex }, { email: regex }], isBanned: false }, { page, limit: 20, select: 'firstName lastName avatar department hdmVerified hostel' });
    return success(res, result.data, 'Users', 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

// GET /api/search/posts
const searchPosts = async (req, res, next) => {
  try {
    const { q, page } = req.query;
    if (!q) throw new AppError('Search query required', 400, 'MISSING_QUERY');
    const regex = { $regex: q, $options: 'i' };
    const result = await paginate(Post, { content: regex, status: 'active', moderationStatus: { $ne: 'removed' } }, { page, limit: 20, sort: { createdAt: -1 }, populate: 'author', select: 'firstName lastName avatar' });
    return success(res, result.data, 'Posts', 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

// GET /api/search/groups
const searchGroups = async (req, res, next) => {
  try {
    const { q, page } = req.query;
    if (!q) throw new AppError('Search query required', 400, 'MISSING_QUERY');
    const regex = { $regex: q, $options: 'i' };
    const result = await paginate(Group, { name: regex, isActive: true }, { page, limit: 20, select: 'name description memberCount coverImage category' });
    return success(res, result.data, 'Groups', 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

// GET /api/search/market
const searchMarketplace = async (req, res, next) => {
  try {
    const { q, page, category } = req.query;
    if (!q) throw new AppError('Search query required', 400, 'MISSING_QUERY');
    const query = { title: { $regex: q, $options: 'i' }, status: 'active' };
    if (category && category !== 'all') query.category = category;
    const result = await paginate(Listing, query, { page, limit: 20, sort: { createdAt: -1 }, populate: 'seller', select: 'firstName lastName avatar hdmVerified' });
    return success(res, result.data, 'Listings', 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

export { searchAll, searchUsers, searchPosts, searchGroups, searchMarketplace };