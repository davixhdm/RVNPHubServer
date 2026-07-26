import User from '../../models/user/User.js';
import * as socketService from '../../services/socketService.js';
import * as pushService from '../../services/pushService.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

// POST /api/friends/follow/:userId
const followUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.userId);
    if (!target) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    if (req.params.userId === req.user._id.toString()) throw new AppError('Cannot follow yourself', 400, 'SELF_FOLLOW');

    const me = await User.findById(req.user._id);
    if (!me.following) me.following = [];
    if (!target.followers) target.followers = [];

    if (me.following.includes(target._id)) throw new AppError('Already following', 400, 'ALREADY_FOLLOWING');

    me.following.push(target._id);
    target.followers.push(req.user._id);
    await Promise.all([me.save(), target.save()]);

    socketService.emitToUser(target._id, 'user:newFollower', { userId: req.user._id, firstName: req.user.firstName, lastName: req.user.lastName });
    await pushService.sendToUser(target._id, { title: 'New Follower', body: `${req.user.firstName} started following you`, data: { type: 'follow' } });

    return success(res, { followingCount: me.following.length, followersCount: target.followers.length }, 'Followed');
  } catch (error) {
    next(error);
  }
};

// POST /api/friends/unfollow/:userId
const unfollowUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.userId);
    if (!target) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    const me = await User.findById(req.user._id);
    me.following = (me.following || []).filter(id => id.toString() !== target._id.toString());
    target.followers = (target.followers || []).filter(id => id.toString() !== req.user._id.toString());
    await Promise.all([me.save(), target.save()]);

    return success(res, { followingCount: me.following.length }, 'Unfollowed');
  } catch (error) {
    next(error);
  }
};

// GET /api/friends/followers/:userId
const getFollowers = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).populate('followers', 'firstName lastName avatar hdmVerified department');
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    return success(res, user.followers || [], 'Followers');
  } catch (error) {
    next(error);
  }
};

// GET /api/friends/following/:userId
const getFollowing = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).populate('following', 'firstName lastName avatar hdmVerified department');
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    return success(res, user.following || [], 'Following');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/friends/remove/:userId
const removeFollower = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id);
    me.followers = (me.followers || []).filter(id => id.toString() !== req.params.userId);
    await me.save();

    const target = await User.findById(req.params.userId);
    if (target) {
      target.following = (target.following || []).filter(id => id.toString() !== req.user._id.toString());
      await target.save();
    }

    return success(res, null, 'Follower removed');
  } catch (error) {
    next(error);
  }
};

export { followUser, unfollowUser, getFollowers, getFollowing, removeFollower };