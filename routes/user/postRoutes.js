import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import { uploadPostImages } from '../../middleware/user/upload.js';
import validateObjectId from '../../middleware/user/validateObjectId.js';
import sanitizeBody from '../../middleware/user/sanitizeBody.js';
import { getFeed, getPostById, createPost, updatePost, deletePost, likePost, commentOnPost, deleteComment, repost, reportPost, markLostFoundClaimed, getComments } from '../../controllers/user/postController.js';

const router = Router();

router.get('/posts', auth(), getFeed);
router.get('/posts/:id', auth(), validateObjectId('id'), getPostById);
router.post('/posts', auth(), uploadPostImages, sanitizeBody, createPost);
router.patch('/posts/:id', auth(), validateObjectId('id'), sanitizeBody, updatePost);
router.delete('/posts/:id', auth(), validateObjectId('id'), deletePost);
router.post('/posts/:id/like', auth(), validateObjectId('id'), likePost);
router.post('/posts/:id/comment', auth(), validateObjectId('id'), sanitizeBody, commentOnPost);
router.delete('/posts/:id/comment/:commentId', auth(), validateObjectId('id'), deleteComment);
router.post('/posts/:id/repost', auth(), validateObjectId('id'), repost);
router.post('/posts/:id/report', auth(), validateObjectId('id'), reportPost);
router.patch('/posts/:id/claim', auth(), validateObjectId('id'), markLostFoundClaimed);
router.get('/posts/:id/comments', auth(), validateObjectId('id'), getComments);

export default router;