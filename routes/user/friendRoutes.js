import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import validateObjectId from '../../middleware/user/validateObjectId.js';
import { followUser, unfollowUser, getFollowers, getFollowing, removeFollower } from '../../controllers/user/friendController.js';

const router = Router();

router.post('/friends/follow/:userId', auth(), validateObjectId('userId'), followUser);
router.post('/friends/unfollow/:userId', auth(), validateObjectId('userId'), unfollowUser);
router.get('/friends/followers/:userId', auth(), validateObjectId('userId'), getFollowers);
router.get('/friends/following/:userId', auth(), validateObjectId('userId'), getFollowing);
router.delete('/friends/remove/:userId', auth(), validateObjectId('userId'), removeFollower);

export default router;