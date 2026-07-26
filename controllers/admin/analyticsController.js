import User from '../../models/user/User.js';
import Post from '../../models/user/Post.js';
import Group from '../../models/user/Group.js';
import Listing from '../../models/user/Listing.js';
import Payment from '../../models/admin/Payment.js';
import { success } from '../../utils/responseHandler.js';
import logger from '../../utils/logger.js';
import Story from '../../models/user/Story.js';

// GET /api/admin/analytics/overview
const getOverview = async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const [totalUsers, usersThisMonth, usersLastMonth, activeToday, totalPosts, postsThisMonth, totalGroups, totalListings, revenueThisMonth] = await Promise.all([
      User.countDocuments({ isBanned: false }),
      User.countDocuments({ createdAt: { $gte: thisMonth } }),
      User.countDocuments({ createdAt: { $gte: lastMonth, $lt: thisMonth } }),
      User.countDocuments({ lastSeen: { $gte: today }, isBanned: false }),
      Post.countDocuments({ status: 'active' }),
      Post.countDocuments({ createdAt: { $gte: thisMonth } }),
      Group.countDocuments({ isActive: true }),
      Listing.countDocuments({ status: 'active' }),
      Payment.aggregate([{ $match: { status: 'paid', createdAt: { $gte: thisMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    const userGrowth = usersLastMonth > 0 ? ((usersThisMonth - usersLastMonth) / usersLastMonth * 100).toFixed(1) : 100;

    return success(res, {
      totalUsers, usersThisMonth, userGrowth: `${userGrowth}%`,
      activeToday, totalPosts, postsThisMonth, totalGroups, totalListings,
      revenueThisMonth: revenueThisMonth[0]?.total || 0,
    }, 'Analytics overview');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/analytics/content
const getContentAnalytics = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [postsPerDay, storiesPerDay, topPosts] = await Promise.all([
      Post.aggregate([{ $match: { createdAt: { $gte: thirtyDaysAgo } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Story.aggregate([{ $match: { createdAt: { $gte: thirtyDaysAgo } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Post.find({ status: 'active' }).sort({ likeCount: -1 }).limit(10).populate('author', 'firstName lastName').select('content likeCount commentCount'),
    ]);

    return success(res, { postsPerDay, storiesPerDay, topPosts }, 'Content analytics');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/analytics/community
const getCommunityAnalytics = async (req, res, next) => {
  try {
    const [groups, topGroups, departmentBreakdown] = await Promise.all([
      Group.countDocuments({ isActive: true }),
      Group.find({ isActive: true }).sort({ memberCount: -1 }).limit(10).select('name memberCount department'),
      User.aggregate([{ $match: { isBanned: false } }, { $group: { _id: '$department', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ]);

    return success(res, { totalGroups: groups, topGroups, departmentBreakdown }, 'Community analytics');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/analytics/departments
const getDepartmentAnalytics = async (req, res, next) => {
  try {
    const breakdown = await User.aggregate([
      { $match: { isBanned: false } },
      { $group: { _id: '$department', users: { $sum: 1 }, verified: { $sum: { $cond: ['$hdmVerified', 1, 0] } } } },
      { $sort: { users: -1 } },
    ]);

    return success(res, breakdown, 'Department analytics');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/analytics/revenue
const getRevenueAnalytics = async (req, res, next) => {
  try {
    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [totalRevenue, revenueThisMonth, revenueByPurpose] = await Promise.all([
      Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'paid', createdAt: { $gte: thisMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: '$purpose', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ]);

    return success(res, {
      totalRevenue: totalRevenue[0]?.total || 0,
      revenueThisMonth: revenueThisMonth[0]?.total || 0,
      revenueByPurpose,
    }, 'Revenue analytics');
  } catch (error) {
    next(error);
  }
};

export { getOverview, getContentAnalytics, getCommunityAnalytics, getDepartmentAnalytics, getRevenueAnalytics };