import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import validateObjectId from '../../middleware/user/validateObjectId.js';
import { togglePostReaction, getPostReactions, toggleCommentReaction } from '../../controllers/user/reactionController.js';

const router = Router();

router.post('/posts/:id/reactions', auth(), validateObjectId('id'), togglePostReaction);
router.get('/posts/:id/reactions', auth({ optional: true }), validateObjectId('id'), getPostReactions);
router.post('/comments/:id/like', auth(), validateObjectId('id'), toggleCommentReaction);

export default router;