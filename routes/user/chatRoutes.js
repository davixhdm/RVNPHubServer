import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import { uploadChatFile as uploadChatFileMiddleware } from '../../middleware/user/upload.js';
import validateObjectId from '../../middleware/user/validateObjectId.js';
import sanitizeBody from '../../middleware/user/sanitizeBody.js';
import {
  getChats, getChatById, createDirectChat, createGroupChat,
  updateGroupChat, addParticipant, removeParticipant, leaveChat,
  pinChat, getAgoraToken, pinFile, unpinFile, aiChat, uploadChatFile,
} from '../../controllers/user/chatController.js';

const router = Router();

router.get('/chats', auth(), getChats);
router.get('/chats/:id', auth(), validateObjectId('id'), getChatById);
router.post('/chats/direct', auth(), sanitizeBody, createDirectChat);
router.post('/chats/group', auth(), sanitizeBody, createGroupChat);
router.patch('/chats/:id', auth(), validateObjectId('id'), sanitizeBody, updateGroupChat);
router.post('/chats/:id/participants', auth(), validateObjectId('id'), addParticipant);
router.delete('/chats/:id/participants/:userId', auth(), validateObjectId('id'), removeParticipant);
router.post('/chats/:id/leave', auth(), validateObjectId('id'), leaveChat);
router.post('/chats/:id/pin', auth(), validateObjectId('id'), pinChat);
router.post('/chats/:id/agora-token', auth(), validateObjectId('id'), getAgoraToken);
router.post('/chats/:id/files', auth(), validateObjectId('id'), pinFile);
router.delete('/chats/:id/files/:fileId', auth(), validateObjectId('id'), unpinFile);
router.post('/chats/ai/chat', auth(), sanitizeBody, aiChat);
router.post('/chats/upload', auth(), uploadChatFileMiddleware, uploadChatFile);

export default router;