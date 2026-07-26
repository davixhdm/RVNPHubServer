import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import { searchAll, searchUsers, searchPosts, searchGroups, searchMarketplace } from '../../controllers/user/searchController.js';

const router = Router();

router.get('/search', auth(), searchAll);
router.get('/search/users', auth(), searchUsers);
router.get('/search/posts', auth(), searchPosts);
router.get('/search/groups', auth(), searchGroups);
router.get('/search/market', auth(), searchMarketplace);

export default router;