import Reaction from '../../models/user/Reaction.js';
import Post from '../../models/user/Post.js';
import Comment from '../../models/user/Comment.js';
import Notification from '../../models/user/Notification.js';
import User from '../../models/user/User.js';
import * as socketService from '../../services/socketService.js';
import * as pushService from '../../services/pushService.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import mongoose from 'mongoose';

const REACTION_TYPES = ['like', 'love', 'haha', 'angry', 'sad', 'cry'];
const REACTION_EMOJIS = { like: '👍', love: '❤️', haha: '😂', angry: '😡', sad: '😢', cry: '😭' };

// POST /api/posts/:id/reactions
const togglePostReaction = async (req, res, next) => {
  try {
    const { type } = req.body;
    if (!REACTION_TYPES.includes(type)) throw new AppError('Invalid reaction type', 400, 'INVALID_TYPE');

    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError('Post not found', 404, 'POST_NOT_FOUND');

    const existing = await Reaction.findOne({ post: req.params.id, user: req.user._id, targetType: 'post' });

    if (existing) {
      if (existing.type === type) {
        await Reaction.deleteOne({ _id: existing._id });
      } else {
        existing.type = type;
        await existing.save();
      }
    } else {
      await Reaction.create({ post: req.params.id, user: req.user._id, type, targetType: 'post' });
    }

    const reactions = await Reaction.aggregate([
      { $match: { post: post._id, targetType: 'post' } },
      { $group: { _id: '$type', count: { $sum: 1 }, users: { $push: '$user' } } },
    ]);

    const reactionCounts = {};
    reactions.forEach(r => { reactionCounts[r._id] = r.count; });

    post.reactions = reactionCounts;
    post.reactionCount = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
    await post.save();

    if (post.author.toString() !== req.user._id.toString()) {
      const isNew = !existing || existing.type !== type;
      if (isNew) {
        await Notification.create({
          recipient: post.author,
          type: 'reaction',
          title: `${req.user.firstName} reacted ${REACTION_EMOJIS[type]} to your post`,
          body: post.content?.substring(0, 80) || 'Your post',
          data: { postId: post._id, userId: req.user._id, reaction: type },
          channels: ['in-app', 'push'],
        });

        socketService.emitToUser(post.author, 'notification:new', {
          type: 'reaction', postId: post._id, user: req.user.firstName, reaction: type,
        });

        await pushService.sendToUser(post.author, {
          title: `${req.user.firstName} reacted ${REACTION_EMOJIS[type]}`,
          body: post.content?.substring(0, 80) || 'Your post',
          data: { type: 'reaction', postId: post._id },
        });
      }
    }

    const recentReactors = await Reaction.find({ post: req.params.id, targetType: 'post' })
      .sort({ createdAt: -1 }).limit(5).populate('user', 'firstName lastName');

    const userReaction = existing ? (existing.type === type ? null : type) : type;

    return success(res, {
      reactionCounts, reactionCount: post.reactionCount,
      recentReactors: recentReactors.map(r => ({ user: r.user, type: r.type, emoji: REACTION_EMOJIS[r.type] })),
      userReaction,
    }, userReaction ? 'Reaction added' : 'Reaction removed');
  } catch (error) { next(error); }
};

// GET /api/posts/:id/reactions
const getPostReactions = async (req, res, next) => {
  try {
    const reactions = await Reaction.aggregate([
      { $match: { post: new mongoose.Types.ObjectId(req.params.id), targetType: 'post' } },
      { $group: { _id: '$type', count: { $sum: 1 }, users: { $push: '$user' } } },
    ]);

    const reactionCounts = {};
    reactions.forEach(r => { reactionCounts[r._id] = r.count; });

    const recentReactors = await Reaction.find({ post: req.params.id, targetType: 'post' })
      .sort({ createdAt: -1 }).limit(10).populate('user', 'firstName lastName avatar');

    const userReaction = req.user
      ? await Reaction.findOne({ post: req.params.id, user: req.user._id, targetType: 'post' })
      : null;

    return success(res, {
      reactionCounts,
      totalCount: Object.values(reactionCounts).reduce((a, b) => a + b, 0),
      recentReactors: recentReactors.map(r => ({ user: r.user, type: r.type, emoji: REACTION_EMOJIS[r.type] })),
      userReaction: userReaction?.type || null,
    }, 'Reactions');
  } catch (error) { next(error); }
};

// POST /api/comments/:id/like
const toggleCommentReaction = async (req, res, next) => {
  try {
    const { type } = req.body;
    if (!REACTION_TYPES.includes(type)) throw new AppError('Invalid reaction type', 400, 'INVALID_TYPE');

    const comment = await Comment.findById(req.params.id);
    if (!comment) throw new AppError('Comment not found', 404, 'COMMENT_NOT_FOUND');

    const existing = await Reaction.findOne({ comment: req.params.id, user: req.user._id, targetType: 'comment' });

    if (existing) {
      if (existing.type === type) {
        await Reaction.deleteOne({ _id: existing._id });
      } else {
        existing.type = type;
        await existing.save();
      }
    } else {
      await Reaction.create({ comment: req.params.id, user: req.user._id, type, targetType: 'comment' });
    }

    const totalReactions = await Reaction.countDocuments({ comment: req.params.id, targetType: 'comment' });
    comment.likeCount = totalReactions;
    await comment.save();

    if (comment.author.toString() !== req.user._id.toString()) {
      const isNew = !existing || existing.type !== type;
      if (isNew) {
        await Notification.create({
          recipient: comment.author,
          type: 'comment_like',
          title: `${req.user.firstName} reacted ${REACTION_EMOJIS[type]} to your comment`,
          body: comment.content?.substring(0, 80) || 'Your comment',
          data: { postId: comment.post, commentId: comment._id, userId: req.user._id, reaction: type },
          channels: ['in-app', 'push'],
        });

        socketService.emitToUser(comment.author, 'notification:new', {
          type: 'comment_like', commentId: comment._id, user: req.user.firstName, reaction: type,
        });
      }
    }

    const userReaction = existing ? (existing.type === type ? null : type) : type;

    return success(res, {
      likeCount: comment.likeCount,
      userReaction,
    }, userReaction ? 'Reaction added' : 'Reaction removed');
  } catch (error) { next(error); }
};

export { togglePostReaction, getPostReactions, toggleCommentReaction };