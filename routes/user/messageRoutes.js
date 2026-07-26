import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import validateObjectId from '../../middleware/user/validateObjectId.js';
import sanitizeBody from '../../middleware/user/sanitizeBody.js';
import { getMessages, sendMessage, editMessage, deleteMessage, markAsRead, createPoll, votePoll } from '../../controllers/user/messageController.js';

const router = Router();

router.get('/chats/:chatId/messages', auth(), validateObjectId('chatId'), getMessages);
router.post('/chats/:chatId/messages', auth(), validateObjectId('chatId'), sanitizeBody, sendMessage);
router.patch('/messages/:id', auth(), validateObjectId('id'), sanitizeBody, editMessage);
router.delete('/messages/:id', auth(), validateObjectId('id'), deleteMessage);
router.post('/chats/:chatId/read', auth(), validateObjectId('chatId'), markAsRead);
router.post('/chats/:chatId/poll', auth(), validateObjectId('chatId'), sanitizeBody, createPoll);
router.post('/messages/:id/poll/vote', auth(), validateObjectId('id'), votePoll);

export default router;