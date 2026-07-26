import User from '../../models/user/User.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

// GET /api/privacy
const getPrivacySettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('privacy blockedUsers');
    return success(res, { privacy: user.privacy, blockedCount: user.blockedUsers?.length || 0 }, 'Privacy settings');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/privacy
const updatePrivacySettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.privacy) {
      user.privacy = {
        hideProfile: false,
        hideLastSeen: false,
        hideOnlineStatus: false,
        hideReadReceipts: false,
        hideLikes: false,
        ghostMode: false,
        allowTagging: true,
        allowMessages: 'everyone',
        allowFriendRequests: true,
        showDepartment: true,
        showHostel: true,
      };
    }

    const fields = [
      'hideProfile', 'hideLastSeen', 'hideOnlineStatus', 'hideReadReceipts',
      'hideLikes', 'ghostMode', 'allowTagging', 'allowFriendRequests',
      'showDepartment', 'showHostel',
    ];

    fields.forEach(f => {
      if (req.body[f] !== undefined) user.privacy[f] = req.body[f];
    });

    if (req.body.allowMessages && ['everyone', 'followers', 'verified', 'none'].includes(req.body.allowMessages)) {
      user.privacy.allowMessages = req.body.allowMessages;
    }

    await user.save();
    return success(res, user.privacy, 'Privacy settings updated');
  } catch (error) {
    next(error);
  }
};

// POST /api/privacy/block/:userId
const blockUser = async (req, res, next) => {
  try {
    if (req.params.userId === req.user._id.toString()) throw new AppError('Cannot block yourself', 400, 'SELF_BLOCK');
    const target = await User.findById(req.params.userId);
    if (!target) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const me = await User.findById(req.user._id);
    if (!me.blockedUsers) me.blockedUsers = [];
    if (me.blockedUsers.includes(target._id)) throw new AppError('User already blocked', 400, 'ALREADY_BLOCKED');

    me.blockedUsers.push(target._id);

    // Remove from followers/following
    me.following = (me.following || []).filter(id => id.toString() !== target._id.toString());
    me.followers = (me.followers || []).filter(id => id.toString() !== target._id.toString());
    target.following = (target.following || []).filter(id => id.toString() !== req.user._id.toString());
    target.followers = (target.followers || []).filter(id => id.toString() !== req.user._id.toString());

    await Promise.all([me.save(), target.save()]);
    return success(res, null, 'User blocked');
  } catch (error) {
    next(error);
  }
};

// POST /api/privacy/unblock/:userId
const unblockUser = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id);
    me.blockedUsers = (me.blockedUsers || []).filter(id => id.toString() !== req.params.userId);
    await me.save();
    return success(res, null, 'User unblocked');
  } catch (error) {
    next(error);
  }
};

// GET /api/privacy/blocked
const getBlockedUsers = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('blockedUsers', 'firstName lastName avatar');
    return success(res, user.blockedUsers || [], 'Blocked users');
  } catch (error) {
    next(error);
  }
};

export { getPrivacySettings, updatePrivacySettings, blockUser, unblockUser, getBlockedUsers };