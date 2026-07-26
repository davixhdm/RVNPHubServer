import Leaderboard from '../../models/user/Leaderboard.js';
import User from '../../models/user/User.js';
import { getWeekRange, getMonthRange } from '../../utils/formatDate.js';
import { calculateUserScore } from '../../utils/calculateScore.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import getSettings from '../../utils/getSettings.js';
import logger from '../../utils/logger.js';

// GET /api/leaderboard
const getLeaderboard = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.leaderboard) throw new AppError('Leaderboard is currently disabled', 403, 'LEADERBOARD_DISABLED');
    const period = req.query.period || 'weekly';
    const { start, end } = period === 'monthly' ? getMonthRange() : getWeekRange();
    const topCount = period === 'monthly' ? settings?.badges?.topContributorMonthlyCount || 20 : settings?.badges?.topContributorWeeklyCount || 10;

    const users = await User.find({ isBanned: false }).select('firstName lastName avatar department contributionScore');
    const scores = [];
    for (const user of users) {
      const { score } = await calculateUserScore(user._id, start, end);
      if (score > 0) scores.push({ user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar, department: user.department }, score });
    }
    scores.sort((a, b) => b.score - a.score);
    return success(res, scores.slice(0, topCount), 'Leaderboard');
  } catch (error) {
    next(error);
  }
};

// GET /api/leaderboard/department/:dept
const getDepartmentLeaderboard = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.leaderboard) throw new AppError('Leaderboard is disabled', 403, 'LEADERBOARD_DISABLED');
    const { start, end } = getWeekRange();
    const users = await User.find({ department: req.params.dept, isBanned: false });
    const scores = [];
    for (const user of users) {
      const { score } = await calculateUserScore(user._id, start, end);
      if (score > 0) scores.push({ user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar }, score });
    }
    scores.sort((a, b) => b.score - a.score);
    return success(res, scores.slice(0, 10), 'Department leaderboard');
  } catch (error) {
    next(error);
  }
};

// GET /api/leaderboard/me
const getMyRank = async (req, res, next) => {
  try {
    const { start, end } = getWeekRange();
    const users = await User.find({ isBanned: false });
    const scores = [];
    for (const user of users) {
      const { score } = await calculateUserScore(user._id, start, end);
      scores.push({ userId: user._id.toString(), score });
    }
    scores.sort((a, b) => b.score - a.score);
    const myIndex = scores.findIndex(s => s.userId === req.user._id.toString());
    return success(res, { rank: myIndex >= 0 ? myIndex + 1 : null, score: myIndex >= 0 ? scores[myIndex].score : 0, total: scores.length }, 'My rank');
  } catch (error) {
    next(error);
  }
};

// GET /api/leaderboard/top
const getTopContributors = async (req, res, next) => {
  try {
    const { start, end } = getWeekRange();
    const users = await User.find({ isBanned: false }).select('firstName lastName avatar department');
    const scores = [];
    for (const user of users) {
      const { score } = await calculateUserScore(user._id, start, end);
      if (score > 0) scores.push({ user, score });
    }
    scores.sort((a, b) => b.score - a.score);
    return success(res, scores.slice(0, 10).map((s, i) => ({ rank: i + 1, ...s.user.toJSON(), score: s.score })), 'Top contributors');
  } catch (error) {
    next(error);
  }
};

export { getLeaderboard, getDepartmentLeaderboard, getMyRank, getTopContributors };