import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import { uploadGroupCover, uploadChatFile } from '../../middleware/user/upload.js';
import validateObjectId from '../../middleware/user/validateObjectId.js';
import sanitizeBody from '../../middleware/user/sanitizeBody.js';
import {
  getGroups, getGroupById, createGroup, updateGroup, deleteGroup,
  joinGroup, leaveGroup, getGroupWall, getGroupEvents, createGroupEvent,
  rsvpEvent, getGroupFiles, uploadGroupFile, deleteGroupFile, discoverGroups,
  requestToJoin, approveMember, rejectMember, addModerator, removeModerator,
  updateGroupSettings, reportGroup, getJoinRequests, removeMember,
} from '../../controllers/user/groupController.js';

const router = Router();

// Discovery & My Groups
router.get('/groups', auth(), getGroups);
router.get('/groups/discover', auth(), discoverGroups);
router.get('/groups/:id', auth(), validateObjectId('id'), getGroupById);

// CRUD
router.post('/groups', auth(), sanitizeBody, createGroup);
router.patch('/groups/:id', auth(), validateObjectId('id'), sanitizeBody, updateGroup);
router.delete('/groups/:id', auth(), validateObjectId('id'), deleteGroup);

// Membership
router.post('/groups/:id/join', auth(), validateObjectId('id'), joinGroup);
router.post('/groups/:id/leave', auth(), validateObjectId('id'), leaveGroup);
router.post('/groups/:id/request', auth(), validateObjectId('id'), requestToJoin);

// Admin — Member Management
router.get('/groups/:id/requests', auth(), validateObjectId('id'), getJoinRequests);
router.post('/groups/:id/approve/:userId', auth(), validateObjectId('id'), approveMember);
router.post('/groups/:id/reject/:userId', auth(), validateObjectId('id'), rejectMember);
router.delete('/groups/:id/member/:userId', auth(), validateObjectId('id'), removeMember);

// Admin — Moderators
router.post('/groups/:id/moderator/:userId', auth(), validateObjectId('id'), addModerator);
router.post('/groups/:id/remove-moderator/:userId', auth(), validateObjectId('id'), removeModerator);

// Admin — Settings
router.patch('/groups/:id/settings', auth(), validateObjectId('id'), sanitizeBody, updateGroupSettings);

// Content
router.get('/groups/:id/wall', auth(), validateObjectId('id'), getGroupWall);
router.get('/groups/:id/events', auth(), validateObjectId('id'), getGroupEvents);
router.post('/groups/:id/events', auth(), validateObjectId('id'), sanitizeBody, createGroupEvent);
router.post('/groups/:id/events/:eventId/rsvp', auth(), validateObjectId('id'), rsvpEvent);
router.get('/groups/:id/files', auth(), validateObjectId('id'), getGroupFiles);
router.post('/groups/:id/files', auth(), validateObjectId('id'), uploadChatFile, uploadGroupFile);
router.delete('/groups/:id/files/:fileId', auth(), validateObjectId('id'), deleteGroupFile);

// Reporting
router.post('/groups/:id/report', auth(), validateObjectId('id'), reportGroup);

export default router;