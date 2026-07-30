import Comment from '../../models/user/Comment.js';
import Post from '../../models/user/Post.js';
import Reaction from '../../models/user/Reaction.js';
import Notification from '../../models/user/Notification.js';
import * as socketService from '../../services/socketService.js';
import * as pushService from '../../services/pushService.js';
import paginate from '../../utils/paginate.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import getSettings from '../../utils/getSettings.js';

// GET /api/posts/:id/comments
const getComments = async (req, res, next) => {
  try {
    const result = await paginate(Comment, {
      post: req.params.id, parentComment: null, isDeleted: false,
    }, {
      page: req.query.page, limit: 20, sort: { createdAt: -1 },
      populate: 'author', select: 'firstName lastName avatar hdmVerified',
    });

    const commentsWithReplies = await Promise.all(result.data.map(async (comment) => {
      const replies = await Comment.find({ parentComment: comment._id, isDeleted: false })
        .sort({ createdAt: 1 }).limit(3).populate('author', 'firstName lastName avatar hdmVerified');
      const totalReplies = await Comment.countDocuments({ parentComment: comment._id, isDeleted: false });
      return { ...comment.toObject(), replies, replyCount: totalReplies, hasMoreReplies: totalReplies > 3 };
    }));

    let userReactions = {};
    if (req.user) {
      const commentIds = result.data.map(c => c._id);
      const reactions = await Reaction.find({
        comment: { $in: commentIds }, user: req.user._id, targetType: 'comment',
      });
      reactions.forEach(r => { userReactions[r.comment.toString()] = r.type; });
    }

    return success(res, { comments: commentsWithReplies, userReactions }, 'Comments', 200, { pagination: result.pagination });
  } catch (error) { next(error); }
};

// POST /api/posts/:id/comments
const createComment = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (req.body.content?.length > (settings?.limits?.commentMaxChars || 500)) {
      throw new AppError('Comment too long', 400, 'TOO_LONG');
    }

    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError('Post not found', 404, 'POST_NOT_FOUND');

    const comment = await Comment.create({
      post: req.params.id,
      author: req.user._id,
      content: req.body.content,
      parentComment: req.body.parentComment || null,
    });

    if (req.body.parentComment) {
      await Comment.findByIdAndUpdate(req.body.parentComment, { $inc: { replyCount: 1 } });
    } else {
      post.commentCount = (post.commentCount || 0) + 1;
      await post.save();
    }

    const populated = await Comment.findById(comment._id).populate('author', 'firstName lastName avatar hdmVerified');

    // Notify post author
    if (post.author.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.author,
        type: 'comment',
        title: `${req.user.firstName} commented on your post`,
        body: req.body.content?.substring(0, 80) || 'New comment',
        data: { postId: post._id, commentId: comment._id, userId: req.user._id },
        channels: ['in-app', 'push'],
      });

      socketService.emitToUser(post.author, 'notification:new', {
        type: 'comment', postId: post._id, user: req.user.firstName, commentId: comment._id,
      });

      await pushService.sendToUser(post.author, {
        title: `${req.user.firstName} commented on your post`,
        body: req.body.content?.substring(0, 80) || 'New comment',
        data: { type: 'comment', postId: post._id },
      });
    }

    // Notify parent comment author if replying
    if (req.body.parentComment) {
      const parent = await Comment.findById(req.body.parentComment);
      if (parent && parent.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: parent.author,
          type: 'comment_reply',
          title: `${req.user.firstName} replied to your comment`,
          body: req.body.content?.substring(0, 80) || 'New reply',
          data: { postId: post._id, commentId: parent._id, replyId: comment._id, userId: req.user._id },
          channels: ['in-app', 'push'],
        });

        socketService.emitToUser(parent.author, 'notification:new', {
          type: 'comment_reply', commentId: parent._id, user: req.user.firstName,
        });

        await pushService.sendToUser(parent.author, {
          title: `${req.user.firstName} replied to your comment`,
          body: req.body.content?.substring(0, 80) || 'New reply',
          data: { type: 'comment_reply', postId: post._id, commentId: parent._id },
        });
      }
    }

    return created(res, populated, 'Comment created');
  } catch (error) { next(error); }
};

// DELETE /api/comments/:id
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findOneAndUpdate(
      { _id: req.params.id, author: req.user._id },
      { isDeleted: true, content: '[deleted]' },
      { new: true }
    );
    if (!comment) throw new AppError('Comment not found or not authorized', 404, 'NOT_FOUND');

    if (!comment.parentComment) {
      await Post.findByIdAndUpdate(comment.post, { $inc: { commentCount: -1 } });
    }

    return success(res, null, 'Comment deleted');
  } catch (error) { next(error); }
};

// GET /api/comments/:id/replies
const getReplies = async (req, res, next) => {
  try {
    const result = await paginate(Comment, {
      parentComment: req.params.id, isDeleted: false,
    }, {
      page: req.query.page, limit: 10, sort: { createdAt: 1 },
      populate: 'author', select: 'firstName lastName avatar hdmVerified',
    });

    let userReactions = {};
    if (req.user) {
      const commentIds = result.data.map(c => c._id);
      const reactions = await Reaction.find({
        comment: { $in: commentIds }, user: req.user._id, targetType: 'comment',
      });
      reactions.forEach(r => { userReactions[r.comment.toString()] = r.type; });
    }

    return success(res, { replies: result.data, userReactions }, 'Replies', 200, { pagination: result.pagination });
  } catch (error) { next(error); }
};

export { getComments, createComment, deleteComment, getReplies };