import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import validateObjectId from '../../middleware/user/validateObjectId.js';
import sanitizeBody from '../../middleware/user/sanitizeBody.js';
import { getComments, createComment, deleteComment, getReplies } from '../../controllers/user/commentController.js';

const router = Router();

router.get('/posts/:id/comments', auth({ optional: true }), validateObjectId('id'), getComments);
router.post('/posts/:id/comments', auth(), validateObjectId('id'), sanitizeBody, createComment);
router.delete('/comments/:id', auth(), validateObjectId('id'), deleteComment);
router.get('/comments/:id/replies', auth({ optional: true }), validateObjectId('id'), getReplies);

export default router;