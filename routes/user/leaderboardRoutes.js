import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import { getLeaderboard, getDepartmentLeaderboard, getMyRank, getTopContributors } from '../../controllers/user/leaderboardController.js';

const router = Router();

router.get('/leaderboard', auth(), getLeaderboard);
router.get('/leaderboard/me', auth(), getMyRank);
router.get('/leaderboard/top', auth(), getTopContributors);
router.get('/leaderboard/department/:dept', auth(), getDepartmentLeaderboard);

export default router;