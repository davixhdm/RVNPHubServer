import User from '../models/user/User.js';
import Badge from '../models/user/Badge.js';
import Leaderboard from '../models/user/Leaderboard.js';
import { calculateUserScore } from '../utils/calculateScore.js';
import { getWeekRange } from '../utils/formatDate.js';
import getSettings from '../utils/getSettings.js';
import * as emailService from '../services/emailService.js';
import * as smsService from '../services/smsService.js';
import * as pushService from '../services/pushService.js';
import * as socketService from '../services/socketService.js';
import logger from '../utils/logger.js';

export const calculateWeeklyAwards = async () => {
  logger.info('Calculating weekly awards...');

  const settings = await getSettings();
  const { start, end } = getWeekRange();
  const weekNumber = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 86400000));
  const topCount = settings?.badges?.topContributorWeeklyCount || 10;

  const users = await User.find({ isBanned: false });
  const scores = [];

  for (const user of users) {
    const result = await calculateUserScore(user._id, start, end);
    if (result.score > 0) {
      scores.push({ user, score: result.score, breakdown: result.breakdown });
    }
  }

  scores.sort((a, b) => b.score - a.score);
  const winners = scores.slice(0, topCount);

  // Revoke previous weekly badges
  await Badge.updateMany(
    { type: 'top_contributor_weekly', isActive: true },
    { isActive: false, revokedAt: new Date(), revokeReason: 'New week started' }
  );

  // Award winners
  for (let i = 0; i < winners.length; i++) {
    const { user, score } = winners[i];

    await Badge.create({
      user: user._id,
      type: 'top_contributor_weekly',
      name: 'Top Contributor — Weekly',
      emoji: '🥇',
      description: `Ranked #${i + 1} this week with ${score} points`,
      tier: 'weekly',
      awardedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 86400000),
      isActive: true,
    });

    await User.findByIdAndUpdate(user._id, {
      $inc: { 'contributionScore.weekly': score },
      $push: {
        badges: {
          type: 'top_contributor_weekly',
          awardedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 86400000),
        },
      },
    });

    socketService.badgeEarned(user._id, { name: 'Top Contributor — Weekly', emoji: '🥇' });
    await pushService.sendToUser(user._id, pushService.buildBadgeNotification('Top Contributor — Weekly', '🥇'));

    if (i === 0) {
      await emailService.sendBadgeEarnedEmail(user, 'Top Contributor — Weekly', '🥇', `You ranked #1 this week`);
      if (user.phone) await smsService.sendBadgeEarnedSMS(user.phone, 'Top Contributor — Weekly');
    }
  }

  // Department leaders
  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];

  await Badge.updateMany(
    { type: 'department_leader', isActive: true },
    { isActive: false, revokedAt: new Date(), revokeReason: 'New week started' }
  );

  for (const dept of departments) {
    const deptUsers = scores.filter(s => s.user.department === dept);
    if (deptUsers.length > 0) {
      const leader = deptUsers[0];
      await Badge.create({
        user: leader.user._id,
        type: 'department_leader',
        name: `${dept.charAt(0).toUpperCase() + dept.slice(1)} Leader`,
        emoji: '🏅',
        description: `Top contributor in ${dept} this week`,
        tier: 'weekly',
        awardedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 86400000),
        isActive: true,
      });
    }
  }

  // Save leaderboard snapshot
  await Leaderboard.create({
    period: 'weekly',
    weekNumber,
    year: new Date().getFullYear(),
    rankings: winners.map((w, i) => ({
      rank: i + 1,
      user: w.user._id,
      score: w.score,
      department: w.user.department,
    })),
    totalParticipants: scores.length,
    calculatedAt: new Date(),
  });

  logger.info(`Weekly awards done: ${winners.length} winners, ${departments.length} department leaders`);
};