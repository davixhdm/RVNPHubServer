import Group from '../../models/user/Group.js';
import User from '../../models/user/User.js';
import Post from '../../models/user/Post.js';
import * as cloudinaryService from '../../services/cloudinaryService.js';
import * as socketService from '../../services/socketService.js';
import * as pushService from '../../services/pushService.js';
import { uniqueSlug } from '../../utils/slugify.js';
import paginate from '../../utils/paginate.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import getSettings from '../../utils/getSettings.js';
import logger from '../../utils/logger.js';

// GET /api/groups
const getGroups = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.groups) throw new AppError('Groups are currently disabled', 403, 'GROUPS_DISABLED');
    const groups = await Group.find({ members: req.user._id, isActive: true }).sort({ updatedAt: -1 });
    return success(res, groups, 'My groups');
  } catch (error) {
    next(error);
  }
};

// GET /api/groups/:id
const getGroupById = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).populate('admin', 'firstName lastName avatar').populate('moderators', 'firstName lastName avatar');
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    return success(res, group, 'Group detail');
  } catch (error) {
    next(error);
  }
};

// POST /api/groups
const createGroup = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.groups) throw new AppError('Groups are currently disabled', 403, 'GROUPS_DISABLED');
    const user = await User.findById(req.user._id);
    const groupCount = await Group.countDocuments({ admin: req.user._id });
    if (user.maxGroups !== -1 && groupCount >= user.maxGroups) throw new AppError(`Max ${user.maxGroups} groups allowed on your plan`, 403, 'MAX_GROUPS');

    const slug = await uniqueSlug(req.body.name, Group);
    const group = await Group.create({ name: req.body.name, description: req.body.description, category: req.body.category, department: req.user.department, slug, admin: req.user._id, members: [req.user._id], memberCount: 1 });
    return created(res, group, 'Group created');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/groups/:id
const updateGroup = async (req, res, next) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, admin: req.user._id });
    if (!group) throw new AppError('Group not found or not authorized', 404, 'NOT_FOUND');
    if (req.body.name) { group.name = req.body.name; group.slug = await uniqueSlug(req.body.name, Group, group._id); }
    if (req.body.description) group.description = req.body.description;
    if (req.body.category) group.category = req.body.category;
    await group.save();
    return success(res, group, 'Group updated');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/groups/:id
const deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findOneAndDelete({ _id: req.params.id, admin: req.user._id });
    if (!group) throw new AppError('Group not found or not authorized', 404, 'NOT_FOUND');
    return success(res, null, 'Group deleted');
  } catch (error) {
    next(error);
  }
};

// POST /api/groups/:id/join
const joinGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    if (group.members.includes(req.user._id)) throw new AppError('Already a member', 400, 'ALREADY_MEMBER');
    group.members.push(req.user._id);
    group.memberCount = group.members.length;
    await group.save();
    socketService.memberJoinedGroup(group._id, { userId: req.user._id, firstName: req.user.firstName });
    return success(res, group, 'Joined group');
  } catch (error) {
    next(error);
  }
};

// POST /api/groups/:id/leave
const leaveGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    group.members = group.members.filter(m => m.toString() !== req.user._id.toString());
    group.memberCount = group.members.length;
    await group.save();
    return success(res, null, 'Left group');
  } catch (error) {
    next(error);
  }
};

// GET /api/groups/:id/wall
const getGroupWall = async (req, res, next) => {
  try {
    const result = await paginate(Post, { group: req.params.id, status: 'active' }, { page: req.query.page, sort: { createdAt: -1 }, populate: 'author' });
    return success(res, result.data, 'Group wall', 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

// GET /api/groups/:id/events
const getGroupEvents = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).select('events');
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    return success(res, group.events, 'Group events');
  } catch (error) {
    next(error);
  }
};

// POST /api/groups/:id/events
const createGroupEvent = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    group.events.push({ title: req.body.title, description: req.body.description, date: req.body.date, location: req.body.location });
    await group.save();
    socketService.emitToGroup(group._id, 'group:newEvent', group.events[group.events.length - 1]);
    return created(res, group.events[group.events.length - 1], 'Event created');
  } catch (error) {
    next(error);
  }
};

// POST /api/groups/:id/events/:eventId/rsvp
const rsvpEvent = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    const event = group.events.id(req.params.eventId);
    if (!event) throw new AppError('Event not found', 404, 'NOT_FOUND');
    const index = event.going.indexOf(req.user._id);
    if (index === -1) { event.going.push(req.user._id); } else { event.going.splice(index, 1); }
    event.goingCount = event.going.length;
    await group.save();
    return success(res, event, index === -1 ? 'RSVP confirmed' : 'RSVP cancelled');
  } catch (error) {
    next(error);
  }
};

// GET /api/groups/:id/files
const getGroupFiles = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).select('files');
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    return success(res, group.files, 'Group files');
  } catch (error) {
    next(error);
  }
};

// POST /api/groups/:id/files
const uploadGroupFile = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('File required', 400, 'FILE_REQUIRED');
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    const upload = await cloudinaryService.uploadChatFile(req.file, group._id, req.user._id);
    if (!upload.success) throw new AppError('Upload failed', 500, 'UPLOAD_FAILED');
    group.files.push({ name: upload.fileName, url: upload.url, uploadedBy: req.user._id });
    await group.save();
    socketService.emitToGroup(group._id, 'group:newFile', group.files[group.files.length - 1]);
    return created(res, group.files[group.files.length - 1], 'File uploaded');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/groups/:id/files/:fileId
const deleteGroupFile = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    group.files = group.files.filter(f => f._id.toString() !== req.params.fileId);
    await group.save();
    return success(res, null, 'File deleted');
  } catch (error) {
    next(error);
  }
};

// GET /api/groups/discover
const discoverGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ isActive: true, members: { $ne: req.user._id } }).sort({ memberCount: -1 }).limit(20);
    return success(res, groups, 'Discover groups');
  } catch (error) {
    next(error);
  }
};



// POST /api/groups/:id/request
const requestToJoin = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    if (group.members.includes(req.user._id)) throw new AppError('Already a member', 400, 'ALREADY_MEMBER');
    if (group.joinRequests.includes(req.user._id)) throw new AppError('Already requested', 400, 'ALREADY_REQUESTED');

    if (group.requiresApproval) {
      group.joinRequests.push(req.user._id);
      await group.save();
      return success(res, null, 'Join request sent');
    }

    group.members.push(req.user._id);
    group.memberCount = group.members.length;
    await group.save();
    return success(res, group, 'Joined group');
  } catch (error) { next(error); }
};

// POST /api/groups/:id/approve/:userId
const approveMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    if (!group.admin.equals(req.user._id) && !group.moderators.includes(req.user._id)) {
      throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
    }

    group.joinRequests = group.joinRequests.filter(id => id.toString() !== req.params.userId);
    if (!group.members.includes(req.params.userId)) {
      group.members.push(req.params.userId);
      group.memberCount = group.members.length;
    }
    await group.save();
    return success(res, null, 'Member approved');
  } catch (error) { next(error); }
};

// POST /api/groups/:id/reject/:userId
const rejectMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    group.joinRequests = group.joinRequests.filter(id => id.toString() !== req.params.userId);
    await group.save();
    return success(res, null, 'Request rejected');
  } catch (error) { next(error); }
};

// POST /api/groups/:id/moderator/:userId
const addModerator = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    if (!group.admin.equals(req.user._id)) throw new AppError('Only admin can add moderators', 403, 'NOT_AUTHORIZED');
    if (!group.moderators.includes(req.params.userId)) {
      group.moderators.push(req.params.userId);
      await group.save();
    }
    return success(res, null, 'Moderator added');
  } catch (error) { next(error); }
};

// POST /api/groups/:id/remove-moderator/:userId
const removeModerator = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    group.moderators = group.moderators.filter(id => id.toString() !== req.params.userId);
    await group.save();
    return success(res, null, 'Moderator removed');
  } catch (error) { next(error); }
};

// PATCH /api/groups/:id/settings
const updateGroupSettings = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    if (!group.admin.equals(req.user._id)) throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');

    if (req.body.requiresApproval !== undefined) group.requiresApproval = req.body.requiresApproval;
    if (req.body.isPrivate !== undefined) group.isPrivate = req.body.isPrivate;
    if (req.body.rules) group.rules = req.body.rules;
    if (req.body.description) group.description = req.body.description;
    await group.save();
    return success(res, group, 'Settings updated');
  } catch (error) { next(error); }
};

// POST /api/groups/:id/report
const reportGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    group.reports.push({ reportedBy: req.user._id, reason: req.body.reason });
    await group.save();
    return success(res, null, 'Report submitted');
  } catch (error) { next(error); }
};

// GET /api/groups/:id/requests
const getJoinRequests = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).populate('joinRequests', 'firstName lastName avatar');
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    if (!group.admin.equals(req.user._id) && !group.moderators.includes(req.user._id)) {
      throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
    }
    return success(res, group.joinRequests, 'Join requests');
  } catch (error) { next(error); }
};

// DELETE /api/groups/:id/member/:userId
const removeMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    if (!group.admin.equals(req.user._id) && !group.moderators.includes(req.user._id)) {
      throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
    }
    group.members = group.members.filter(id => id.toString() !== req.params.userId);
    group.moderators = group.moderators.filter(id => id.toString() !== req.params.userId);
    group.memberCount = group.members.length;
    await group.save();
    return success(res, null, 'Member removed');
  } catch (error) { next(error); }
};

export {
  getGroups, getGroupById, createGroup, updateGroup, deleteGroup,
  joinGroup, leaveGroup, getGroupWall, getGroupEvents, createGroupEvent,
  rsvpEvent, getGroupFiles, uploadGroupFile, deleteGroupFile, discoverGroups,
  requestToJoin, approveMember, rejectMember, addModerator, removeModerator,
  updateGroupSettings, reportGroup, getJoinRequests, removeMember,
};