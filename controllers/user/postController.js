import Post from '../../models/user/Post.js';
import User from '../../models/user/User.js';
import * as moderationService from '../../services/moderationService.js';
import * as cloudinaryService from '../../services/cloudinaryService.js';
import * as socketService from '../../services/socketService.js';
import * as pushService from '../../services/pushService.js';
import * as emailService from '../../services/emailService.js';
import * as feedService from '../../services/feedService.js';
import paginate from '../../utils/paginate.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import getSettings from '../../utils/getSettings.js';
import logger from '../../utils/logger.js';

// GET /api/posts
const getFeed = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.posts) throw new AppError('Posts are currently disabled', 403, 'POSTS_DISABLED');
    const tab = req.query.tab || 'all';
    const page = parseInt(req.query.page) || 1;

    // If logged in, use smart feed
    if (req.user) {
      const result = await feedService.getUserFeed(req.user._id, tab, page, req.user);
      return success(res, result.data, 'Feed', 200, { pagination: result.pagination });
    }

    // Public feed — only active, approved posts
    const query = { status: 'active', moderationStatus: 'approved' };
    if (tab === 'urgent') query.isUrgent = true;
    if (tab === 'dept' || tab === 'sports' || tab === 'projects' || tab === 'qna' || tab === 'trade') {
      query.category = tab;
    }

    const result = await paginate(Post, query, {
      page, limit: 20, sort: { isUrgent: -1, createdAt: -1 },
      populate: 'author', select: 'firstName lastName avatar hdmVerified department',
    });
    return success(res, result.data, 'Public feed', 200, { pagination: result.pagination });
  } catch (error) { next(error); }
};

// GET /api/posts/:id
const getPostById = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.user) { query.status = 'active'; query.moderationStatus = 'approved'; }
    const post = await Post.findOne(query)
      .populate('author', 'firstName lastName avatar hdmVerified department')
      .populate('comments.author', 'firstName lastName avatar');
    if (!post) throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    return success(res, post, 'Post detail');
  } catch (error) { next(error); }
};

// POST /api/posts
const createPost = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.posts) throw new AppError('Posts are currently disabled', 403, 'POSTS_DISABLED');

    if (req.body.content && req.body.content.length > (settings?.limits?.postMaxChars || 2000)) {
      throw new AppError(`Post too long. Max ${settings.limits.postMaxChars} chars`, 400, 'TOO_LONG');
    }

    // Upload images
    let images = [];
    if (req.files?.length > 0) {
      const upload = await cloudinaryService.uploadPostImages(req.files, req.user._id);
      if (upload.success) images = upload.urls;
    }

    // Parse location — handles JSON string, plain string, or HTML-encoded
    let location = null;
    if (req.body.location) {
      try {
        let locStr = req.body.location;
        locStr = locStr.replace(/&quot;/g, '"').replace(/&#x2F;/g, '/').replace(/&amp;/g, '&');
        if (locStr.startsWith('{') || locStr.startsWith('"')) {
          const parsed = JSON.parse(locStr);
          location = typeof parsed === 'string' ? { name: parsed } : parsed;
        } else {
          location = { name: locStr };
        }
      } catch {
        location = { name: req.body.location };
      }
    }
    if (req.body.latitude && req.body.longitude) {
      if (!location) location = { name: req.body.location || 'Unknown Location' };
      location.type = 'Point';
      location.coordinates = [parseFloat(req.body.longitude), parseFloat(req.body.latitude)];
    }

    // Parse poll options
    let pollOptions = null;
    if (req.body.pollOptions) {
      try {
        pollOptions = typeof req.body.pollOptions === 'string'
          ? JSON.parse(req.body.pollOptions)
          : req.body.pollOptions;
      } catch { pollOptions = null; }
    }

    const isUrgent = req.body.isUrgent === 'true' || req.body.isUrgent === true;

    const postData = {
      author: req.user._id,
      type: req.body.type || 'post',
      content: req.body.content || '',
      images,
      category: req.body.category || 'all',
      department: req.user.department,
      location,
      eventDate: req.body.eventDate || null,
      isUrgent,
      feeling: req.body.feeling || null,
      pollOptions,
      group: req.body.group || null,
    };

    const moderation = await moderationService.reviewContent(postData.content, images[0]);
    postData.moderationStatus = moderation.status === 'removed' ? 'removed' : 
                                 moderation.status === 'flagged' ? 'flagged' : 'approved';

    const post = await Post.create(postData);

    if (moderation.status === 'removed') {
      await emailService.sendContentWarningEmail(req.user, req.body.content?.substring(0, 100), moderation.reason);
    }

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'firstName lastName avatar hdmVerified department');

    socketService.newPostInFeed(populatedPost);
    return created(res, populatedPost, 'Post created');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/posts/:id
const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
    if (!post) throw new AppError('Post not found or not authorized', 404, 'POST_NOT_FOUND');

    if (req.body.content) post.content = req.body.content;
    if (req.body.isUrgent !== undefined) {
      post.isUrgent = req.body.isUrgent === 'true' || req.body.isUrgent === true;
    }
    if (req.body.feeling !== undefined) post.feeling = req.body.feeling || null;

    // Handle location
    if (req.body.location !== undefined) {
      if (!req.body.location || req.body.location === '') {
        post.location = null;
      } else {
        try {
          let locStr = req.body.location;
          locStr = locStr.replace(/&quot;/g, '"').replace(/&#x2F;/g, '/').replace(/&amp;/g, '&');
          if (locStr.startsWith('{') || locStr.startsWith('"')) {
            const parsed = JSON.parse(locStr);
            post.location = typeof parsed === 'string' ? { name: parsed } : parsed;
          } else {
            post.location = { name: locStr };
          }
        } catch {
          post.location = { name: req.body.location };
        }
      }
    }
    if (req.body.latitude && req.body.longitude) {
      if (!post.location) post.location = { name: req.body.location || 'Unknown Location' };
      post.location.type = 'Point';
      post.location.coordinates = [parseFloat(req.body.longitude), parseFloat(req.body.latitude)];
    }

    await post.save();
    socketService.emitToUser(req.user._id, 'post:updated', post);
    return success(res, post, 'Post updated');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/posts/:id
const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, author: req.user._id });
    if (!post) throw new AppError('Post not found or not authorized', 404, 'POST_NOT_FOUND');
    if (post.images?.length > 0) {
      const publicIds = post.images.map(url => {
        const parts = url.split('/');
        const filename = parts[parts.length - 1].split('.')[0];
        return `hdm-rvnp/posts/${filename}`;
      });
      await cloudinaryService.deleteFiles(publicIds);
    }
    socketService.emitToUser(req.user._id, 'post:deleted', { postId: req.params.id });
    return success(res, null, 'Post deleted');
  } catch (error) {
    next(error);
  }
};

// POST /api/posts/:id/like
const likePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    const index = post.likes.indexOf(req.user._id);
    if (index === -1) { post.likes.push(req.user._id); } else { post.likes.splice(index, 1); }
    post.likeCount = post.likes.length;
    await post.save();

    if (index === -1 && post.author.toString() !== req.user._id.toString()) {
      const author = await User.findById(post.author);
      
      // Save notification to database
      const Notification = (await import('../../models/user/Notification.js')).default;
      await Notification.create({
        recipient: post.author,
        type: 'like',
        title: `${req.user.firstName} liked your post`,
        body: post.content?.substring(0, 80) || 'Your post',
        data: { postId: post._id, userId: req.user._id },
        channels: ['in-app', 'push'],
      });

      socketService.emitToUser(post.author, 'notification:new', { type: 'like', postId: post._id, user: req.user.firstName });
      await pushService.sendToUser(post.author, pushService.buildLikeNotification(req.user.firstName, post.content?.substring(0, 80)));
    }
    return success(res, { likes: post.likes, likeCount: post.likeCount }, index === -1 ? 'Liked' : 'Unliked');
  } catch (error) {
    next(error);
  }
};

// POST /api/posts/:id/comment
const commentOnPost = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (req.body.content?.length > (settings?.limits?.commentMaxChars || 500)) {
      throw new AppError(`Comment too long`, 400, 'TOO_LONG');
    }

    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError('Post not found', 404, 'POST_NOT_FOUND');

    const comment = {
      author: req.user._id,
      content: req.body.content,
      createdAt: new Date(),
    };

    post.comments.push(comment);
    post.commentCount = post.comments.length;
    await post.save();

    const newComment = post.comments[post.comments.length - 1];

    // Notify post author if commenter is not the author
    if (post.author.toString() !== req.user._id.toString()) {
      const author = await User.findById(post.author);

      // Save notification to database
      const Notification = (await import('../../models/user/Notification.js')).default;
      await Notification.create({
        recipient: post.author,
        type: 'comment',
        title: `${req.user.firstName} commented on your post`,
        body: req.body.content?.substring(0, 80) || 'New comment',
        data: { postId: post._id, userId: req.user._id },
        channels: ['in-app', 'push'],
      });

      // Real-time socket
      socketService.emitToUser(post.author, 'notification:new', {
        type: 'comment',
        postId: post._id,
        user: req.user.firstName,
        comment: req.body.content?.substring(0, 80),
      });

      // Push notification
      await pushService.sendToUser(
        post.author,
        pushService.buildCommentNotification(req.user.firstName, post.content?.substring(0, 80))
      );
    }

    // Populate the comment author for the response
    const populatedPost = await Post.findById(req.params.id)
      .select('comments')
      .populate('comments.author', 'firstName lastName avatar');

    const populatedComment = populatedPost.comments[populatedPost.comments.length - 1];

    return success(res, populatedComment, 'Comment added');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/posts/:id/comment/:commentId
const deleteComment = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    post.comments = post.comments.filter(c =>
      !(c._id.toString() === req.params.commentId && c.author.toString() === req.user._id.toString())
    );
    post.commentCount = post.comments.length;
    await post.save();
    return success(res, null, 'Comment deleted');
  } catch (error) {
    next(error);
  }
};

// POST /api/posts/:id/repost
const repost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    if (!post.reposts.includes(req.user._id)) {
      post.reposts.push(req.user._id);
      post.repostCount = post.reposts.length;
      await post.save();
    }
    return success(res, { repostCount: post.repostCount }, 'Reposted');
  } catch (error) {
    next(error);
  }
};

// POST /api/posts/:id/report
const reportPost = async (req, res, next) => {
  try {
    const Report = (await import('../../models/admin/Report.js')).default;
    await Report.create({
      reportedBy: req.user._id, reportedContent: req.params.id,
      contentType: 'post', reportType: req.body.type, description: req.body.description,
    });
    return success(res, null, 'Report submitted');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/posts/:id/claim
const markLostFoundClaimed = async (req, res, next) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, type: 'lost_found', author: req.user._id },
      { status: 'claimed' }, { new: true }
    );
    if (!post) throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    return success(res, post, 'Item marked as claimed');
  } catch (error) {
    next(error);
  }
};

// GET /api/posts/:id/comments
const getComments = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).select('comments').populate('comments.author', 'firstName lastName avatar');
    if (!post) throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
    return success(res, post.comments, 'Comments');
  } catch (error) {
    next(error);
  }
};

export {
  getFeed, getPostById, createPost, updatePost, deletePost,
  likePost, commentOnPost, deleteComment, repost, reportPost,
  markLostFoundClaimed, getComments,
};