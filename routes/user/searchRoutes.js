import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import { searchAll, searchUsers, searchPosts, searchGroups, searchMarketplace } from '../../controllers/user/searchController.js';

const router = Router();

router.get('/search', auth({ optional: true }), searchAll);
router.get('/search/users', auth({ optional: true }), searchUsers);
router.get('/search/posts', auth({ optional: true }), searchPosts);
router.get('/search/groups', auth({ optional: true }), searchGroups);
router.get('/search/market', auth({ optional: true }), searchMarketplace);

export default router;