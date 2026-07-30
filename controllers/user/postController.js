import Post from '../../models/user/Post.js';
import User from '../../models/user/User.js';
import Reaction from '../../models/user/Reaction.js';
import Comment from '../../models/user/Comment.js';
import Notification from '../../models/user/Notification.js';
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

    // Logged in — use smart feed
    if (req.user) {
      const result = await feedService.getUserFeed(req.user._id, tab, page, req.user);
      return success(res, result.data, 'Feed', 200, { pagination: result.pagination });
    }

    // Public feed — return all post fields
    const query = { status: 'active', moderationStatus: 'approved' };
    if (tab === 'urgent') query.isUrgent = true;
    if (['dept', 'sports', 'projects', 'qna', 'trade'].includes(tab)) query.category = tab;

    const skip = (page - 1) * 20;
    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ isUrgent: -1, createdAt: -1 })
        .skip(skip)
        .limit(20)
        .populate('author', 'firstName lastName avatar hdmVerified department')
        .lean(),
      Post.countDocuments(query),
    ]);

    return success(res, posts, 'Public feed', 200, {
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / 20),
        totalItems: total,
        hasNext: skip + 20 < total,
        hasPrev: page > 1,
        limit: 20,
      },
    });
  } catch (error) { next(error); }
};

// GET /api/posts/:id
const getPostById = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (!req.user) { query.status = 'active'; query.moderationStatus = 'approved'; }
    const post = await Post.findOne(query).populate('author', 'firstName lastName avatar hdmVerified department');
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

    let images = [];
    if (req.files?.length > 0) {
      const upload = await cloudinaryService.uploadPostImages(req.files, req.user._id);
      if (upload.success) images = upload.urls;
    }

    let location = null;
    if (req.body.location) {
      try {
        let locStr = req.body.location;
        locStr = locStr.replace(/&quot;/g, '"').replace(/&#x2F;/g, '/').replace(/&amp;/g, '&');
        if (locStr.startsWith('{') || locStr.startsWith('"')) {
          const parsed = JSON.parse(locStr);
          location = typeof parsed === 'string' ? { name: parsed } : parsed;
        } else { location = { name: locStr }; }
      } catch { location = { name: req.body.location }; }
    }
    if (req.body.latitude && req.body.longitude) {
      if (!location) location = { name: req.body.location || 'Unknown Location' };
      location.type = 'Point';
      location.coordinates = [parseFloat(req.body.longitude), parseFloat(req.body.latitude)];
    }

    let pollOptions = null;
    if (req.body.pollOptions) {
      try { pollOptions = typeof req.body.pollOptions === 'string' ? JSON.parse(req.body.pollOptions) : req.body.pollOptions; }
      catch { pollOptions = null; }
    }

    const isUrgent = req.body.isUrgent === 'true' || req.body.isUrgent === true;

    const postData = {
      author: req.user._id, type: req.body.type || 'post', content: req.body.content || '',
      images, category: req.body.category || 'all', department: req.user.department,
      location, eventDate: req.body.eventDate || null, isUrgent,
      feeling: req.body.feeling || null, pollOptions, group: req.body.group || null,
    };

    const moderation = await moderationService.reviewContent(postData.content, images[0]);
    postData.moderationStatus = moderation.status === 'removed' ? 'removed' : moderation.status === 'flagged' ? 'flagged' : 'approved';

    const post = await Post.create(postData);

    if (moderation.status === 'removed') {
      await emailService.sendContentWarningEmail(req.user, req.body.content?.substring(0, 100), moderation.reason);
    }

    const populatedPost = await Post.findById(post._id).populate('author', 'firstName lastName avatar hdmVerified department');
    socketService.newPostInFeed(populatedPost);
    return created(res, populatedPost, 'Post created');
  } catch (error) { next(error); }
};

// PATCH /api/posts/:id
const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
    if (!post) throw new AppError('Post not found or not authorized', 404, 'POST_NOT_FOUND');
    if (req.body.content) post.content = req.body.content;
    if (req.body.isUrgent !== undefined) post.isUrgent = req.body.isUrgent === 'true' || req.body.isUrgent === true;
    if (req.body.feeling !== undefined) post.feeling = req.body.feeling || null;
    if (req.body.location !== undefined) {
      if (!req.body.location || req.body.location === '') { post.location = null; }
      else {
        try {
          let locStr = req.body.location;
          locStr = locStr.replace(/&quot;/g, '"').replace(/&#x2F;/g, '/').replace(/&amp;/g, '&');
          if (locStr.startsWith('{') || locStr.startsWith('"')) {
            const parsed = JSON.parse(locStr);
            post.location = typeof parsed === 'string' ? { name: parsed } : parsed;
          } else { post.location = { name: locStr }; }
        } catch { post.location = { name: req.body.location }; }
      }
    }
    await post.save();
    socketService.emitToUser(req.user._id, 'post:updated', post);
    return success(res, post, 'Post updated');
  } catch (error) { next(error); }
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
    await Reaction.deleteMany({ post: post._id, targetType: 'post' });
    await Comment.deleteMany({ post: post._id });
    socketService.emitToUser(req.user._id, 'post:deleted', { postId: req.params.id });
    return success(res, null, 'Post deleted');
  } catch (error) { next(error); }
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
  } catch (error) { next(error); }
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
  } catch (error) { next(error); }
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
  } catch (error) { next(error); }
};

export {
  getFeed, getPostById, createPost, updatePost, deletePost,
  repost, reportPost, markLostFoundClaimed,
};