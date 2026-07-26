import User from '../../models/user/User.js';
import Post from '../../models/user/Post.js';
import Group from '../../models/user/Group.js';
import Listing from '../../models/user/Listing.js';
import Story from '../../models/user/Story.js';
import Report from '../../models/admin/Report.js';
import SupportTicket from '../../models/admin/SupportTicket.js';
import Payment from '../../models/admin/Payment.js';
import { success } from '../../utils/responseHandler.js';
import logger from '../../utils/logger.js';

// GET /api/admin/stats
const getStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeToday,
      totalPosts,
      totalGroups,
      activeListings,
      storiesToday,
      pendingReports,
      openTickets,
      totalRevenue,
      newUsersToday,
    ] = await Promise.all([
      User.countDocuments({ isBanned: false }),
      User.countDocuments({ lastSeen: { $gte: today }, isBanned: false }),
      Post.countDocuments({ status: 'active', moderationStatus: { $ne: 'removed' } }),
      Group.countDocuments({ isActive: true }),
      Listing.countDocuments({ status: 'active' }),
      Story.countDocuments({ createdAt: { $gte: today } }),
      Report.countDocuments({ status: 'pending' }),
      SupportTicket.countDocuments({ status: 'open' }),
      Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      User.countDocuments({ createdAt: { $gte: today } }),
    ]);

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    return success(res, {
      totalUsers,
      activeToday,
      newUsersToday,
      totalPosts,
      totalGroups,
      activeListings,
      storiesToday,
      pendingReports,
      openTickets,
      totalRevenue: revenue,
    }, 'Dashboard stats');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/stats/quick
const getQuickStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeToday, newUsersToday, postsToday, newReports] = await Promise.all([
      User.countDocuments({ lastSeen: { $gte: today }, isBanned: false }),
      User.countDocuments({ createdAt: { $gte: today } }),
      Post.countDocuments({ createdAt: { $gte: today } }),
      Report.countDocuments({ createdAt: { $gte: today } }),
    ]);

    return success(res, { activeToday, newUsersToday, postsToday, newReports }, 'Quick stats');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/stats/user-growth
const getUserGrowth = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 86400000);

    const growth = await User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    return success(res, growth, 'User growth data');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/stats/content-activity
const getContentActivity = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 86400000);

    const [posts, stories, listings] = await Promise.all([
      Post.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Story.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Listing.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);

    return success(res, { posts, stories, listings }, 'Content activity');
  } catch (error) {
    next(error);
  }
};

export { getStats, getQuickStats, getUserGrowth, getContentActivity };