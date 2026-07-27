import User from '../../models/user/User.js';
import Post from '../../models/user/Post.js';
import Group from '../../models/user/Group.js';
import Listing from '../../models/user/Listing.js';
import paginate from '../../utils/paginate.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';

const searchAll = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) throw new AppError('Search query required', 400, 'MISSING_QUERY');
    const regex = { $regex: q, $options: 'i' };

    const userQuery = { $or: [{ firstName: regex }, { lastName: regex }] };
    if (req.user) userQuery.isBanned = false;
    const postQuery = { content: regex };
    if (req.user) { postQuery.status = 'active'; postQuery.moderationStatus = { $ne: 'removed' }; }
    const listingQuery = { title: regex };
    if (req.user) listingQuery.status = 'active';

    const [users, posts, groups, listings] = await Promise.all([
      User.find(userQuery).limit(5).select('firstName lastName avatar department hdmVerified'),
      Post.find(postQuery).limit(5).populate('author', 'firstName lastName avatar'),
      Group.find({ name: regex, isActive: true }).limit(5).select('name memberCount coverImage'),
      Listing.find(listingQuery).limit(5).select('title price images'),
    ]);

    return success(res, { users, posts, groups, listings }, 'Search results');
  } catch (error) { next(error); }
};

const searchUsers = async (req, res, next) => {
  try {
    const { q, page } = req.query;
    const query = {};
    if (req.user) query.isBanned = false;
    if (q) {
      const regex = { $regex: q, $options: 'i' };
      query.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
    }
    const result = await paginate(User, query, {
      page, limit: 20,
      select: 'firstName lastName avatar department hdmVerified hostel',
    });
    return success(res, result.data, 'Users', 200, { pagination: result.pagination });
  } catch (error) { next(error); }
};

const searchPosts = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) throw new AppError('Search query required', 400, 'MISSING_QUERY');
    const regex = { $regex: q, $options: 'i' };
    const query = { content: regex };
    if (req.user) { query.status = 'active'; query.moderationStatus = { $ne: 'removed' }; }
    const result = await paginate(Post, query, {
      page: req.query.page, limit: 20, sort: { createdAt: -1 },
      populate: 'author', select: 'firstName lastName avatar',
    });
    return success(res, result.data, 'Posts', 200, { pagination: result.pagination });
  } catch (error) { next(error); }
};

const searchGroups = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) throw new AppError('Search query required', 400, 'MISSING_QUERY');
    const regex = { $regex: q, $options: 'i' };
    const result = await paginate(Group, { name: regex, isActive: true }, {
      page: req.query.page, limit: 20,
      select: 'name description memberCount coverImage category',
    });
    return success(res, result.data, 'Groups', 200, { pagination: result.pagination });
  } catch (error) { next(error); }
};

const searchMarketplace = async (req, res, next) => {
  try {
    const { q, category } = req.query;
    if (!q) throw new AppError('Search query required', 400, 'MISSING_QUERY');
    const query = { title: { $regex: q, $options: 'i' } };
    if (req.user) query.status = 'active';
    if (category && category !== 'all') query.category = category;
    const result = await paginate(Listing, query, {
      page: req.query.page, limit: 20, sort: { createdAt: -1 },
      populate: 'seller', select: 'firstName lastName avatar hdmVerified',
    });
    return success(res, result.data, 'Listings', 200, { pagination: result.pagination });
  } catch (error) { next(error); }
};

export { searchAll, searchUsers, searchPosts, searchGroups, searchMarketplace };