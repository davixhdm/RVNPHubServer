import Story from '../../models/user/Story.js';
import User from '../../models/user/User.js';
import * as moderationService from '../../services/moderationService.js';
import * as cloudinaryService from '../../services/cloudinaryService.js';
import * as socketService from '../../services/socketService.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import getSettings from '../../utils/getSettings.js';
import logger from '../../utils/logger.js';
import * as pushService from '../../services/pushService.js';

// GET /api/stories
const getStories = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.stories) throw new AppError('Stories are currently disabled', 403, 'STORIES_DISABLED');

    const user = await User.findById(req.user._id);
    const following = user.following || [];

    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
      moderationStatus: { $ne: 'removed' },
      $or: [
        { author: req.user._id },
        { author: { $in: following } },
        { isOfficial: true },
        { department: user.department, isDepartment: true },
      ],
    })
      .sort({ isOfficial: -1, createdAt: -1 })
      .populate('author', 'firstName lastName avatar hdmVerified');

    // Sanitize — hide stats for stories not owned by the current user
    const sanitized = stories.map(story => {
      const s = story.toObject();
      if (s.author._id.toString() !== req.user._id.toString()) {
        delete s.viewers;
        delete s.reactions;
        s.viewCount = 0;
        s.reactionCount = 0;
      }
      return s;
    });

    return success(res, sanitized, 'Active stories');
  } catch (error) {
    next(error);
  }
};

// POST /api/stories
const createStory = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.stories) throw new AppError('Stories are currently disabled', 403, 'STORIES_DISABLED');

    let mediaUrl = null;
    let mediaType = 'text';

    // If file uploaded — image or video
    if (req.file) {
      mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
      const upload = await cloudinaryService.uploadStory(req.file, req.user._id, mediaType);
      if (!upload.success) throw new AppError('Upload failed', 500, 'UPLOAD_FAILED');
      mediaUrl = upload.url;
    }

    // If text content provided — text story
    if (req.body.textContent) {
      mediaType = 'text';
    }

    const moderation = await moderationService.reviewContent(
      req.body.caption || req.body.textContent,
      mediaUrl
    );

    const story = await Story.create({
      author: req.user._id,
      mediaUrl,
      mediaType,
      caption: req.body.caption || '',
      textContent: req.body.textContent || null,
      backgroundColor: req.body.backgroundColor || '#1B5E20',
      textColor: req.body.textColor || '#FFFFFF',
      location: req.body.location,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      moderationStatus: moderation.status === 'removed' ? 'removed' : 'approved',
    });

    socketService.newStoryAvailable(req.user._id, story);
    return created(res, story, 'Story created');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/stories/:id
const deleteStory = async (req, res, next) => {
  try {
    const story = await Story.findOneAndDelete({ _id: req.params.id, author: req.user._id });
    if (!story) throw new AppError('Story not found', 404, 'NOT_FOUND');
    if (story.mediaUrl) await cloudinaryService.deleteFile(story.mediaUrl);
    return success(res, null, 'Story deleted');
  } catch (error) {
    next(error);
  }
};

// POST /api/stories/:id/view
const viewStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) throw new AppError('Story not found', 404, 'NOT_FOUND');
    if (!story.viewers.includes(req.user._id)) {
      story.viewers.push(req.user._id);
      story.viewCount = story.viewers.length;
      await story.save();
    }
    return success(res, { viewCount: story.viewCount }, 'Viewed');
  } catch (error) {
    next(error);
  }
};

// GET /api/stories/:id/viewers
const getStoryViewers = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id).populate('viewers', 'firstName lastName avatar');
    if (!story) throw new AppError('Story not found', 404, 'NOT_FOUND');
    return success(res, story.viewers, 'Viewers');
  } catch (error) {
    next(error);
  }
};

const reactToStory = async (req, res, next) => {
  try {
    const { reaction } = req.body;
    if (!reaction) throw new AppError('Reaction is required', 400, 'MISSING_REACTION');

    const story = await Story.findById(req.params.id);
    if (!story) throw new AppError('Story not found', 404, 'NOT_FOUND');

    if (!story.reactions) story.reactions = {};
    const current = story.reactions.get?.(reaction) || story.reactions[reaction] || 0;
    
    if (story.reactions.set) {
      story.reactions.set(reaction, current + 1);
    } else {
      story.reactions[reaction] = current + 1;
    }
    
    story.reactionCount = Object.values(story.reactions).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
    await story.save();

    // Notify story owner
    if (story.author.toString() !== req.user._id.toString()) {
      const author = await User.findById(story.author);
      if (author) {
        socketService.emitToUser(story.author, 'notification:new', {
          type: 'story_reaction',
          storyId: story._id,
          user: req.user.firstName,
          reaction,
        });
        await pushService.sendToUser(story.author, {
          title: 'Story Reaction',
          body: `${req.user.firstName} reacted ${reaction} to your story`,
          data: { type: 'story_reaction', storyId: story._id },
        });
      }
    }

    return success(res, {
      reactions: story.reactions,
      reactionCount: story.reactionCount,
    }, 'Reaction added');
  } catch (error) {
    next(error);
  }
};

// POST /api/stories/department
const createDepartmentStory = async (req, res, next) => {
  try {
    if (!req.file && !req.body.textContent) throw new AppError('Media or text required', 400, 'CONTENT_REQUIRED');

    let mediaUrl = null;
    let mediaType = 'text';

    if (req.file) {
      mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
      const upload = await cloudinaryService.uploadStory(req.file, req.user._id, mediaType);
      if (!upload.success) throw new AppError('Upload failed', 500, 'UPLOAD_FAILED');
      mediaUrl = upload.url;
    }

    const story = await Story.create({
      author: req.user._id,
      mediaUrl,
      mediaType: req.body.textContent ? 'text' : mediaType,
      caption: req.body.caption || '',
      textContent: req.body.textContent || null,
      backgroundColor: req.body.backgroundColor || '#1B5E20',
      textColor: req.body.textColor || '#FFFFFF',
      isDepartment: true,
      department: req.user.department,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      moderationStatus: 'approved',
    });

    socketService.departmentStoryAdded(req.user.department, story);
    return created(res, story, 'Department story created');
  } catch (error) {
    next(error);
  }
};

// POST /api/stories/:id/report
const reportStory = async (req, res, next) => {
  try {
    const Report = (await import('../../models/admin/Report.js')).default;
    await Report.create({
      reportedBy: req.user._id,
      reportedContent: req.params.id,
      contentType: 'story',
      reportType: req.body.type,
      description: req.body.description,
    });
    return success(res, null, 'Report submitted');
  } catch (error) {
    next(error);
  }
};

export {
  getStories, createStory, deleteStory, viewStory, getStoryViewers,
  reactToStory, createDepartmentStory, reportStory,
};