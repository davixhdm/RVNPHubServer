import User from '../models/user/User.js';
import Badge from '../models/user/Badge.js';
import Listing from '../models/user/Listing.js';
import Post from '../models/user/Post.js';
import Group from '../models/user/Group.js';
import Leaderboard from '../models/user/Leaderboard.js';
import { calculateUserScore } from '../utils/calculateScore.js';
import { getMonthRange } from '../utils/formatDate.js';
import getSettings from '../utils/getSettings.js';
import * as emailService from '../services/emailService.js';
import * as smsService from '../services/smsService.js';
import * as pushService from '../services/pushService.js';
import * as socketService from '../services/socketService.js';
import logger from '../utils/logger.js';

export const calculateMonthlyAwards = async () => {
  logger.info('Calculating monthly awards...');

  const settings = await getSettings();
  const { start, end } = getMonthRange();
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const topCount = settings?.badges?.topContributorMonthlyCount || 20;

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

  // Revoke previous monthly badges
  await Badge.updateMany(
    { type: 'top_contributor_monthly', isActive: true },
    { isActive: false, revokedAt: new Date(), revokeReason: 'New month started' }
  );

  // Award top contributors
  for (let i = 0; i < winners.length; i++) {
    const { user, score } = winners[i];

    await Badge.create({
      user: user._id,
      type: 'top_contributor_monthly',
      name: 'Top Contributor — Monthly',
      emoji: '🥈',
      description: `Ranked #${i + 1} this month with ${score} points`,
      tier: 'monthly',
      awardedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
      isActive: true,
    });

    await User.findByIdAndUpdate(user._id, {
      $inc: { 'contributionScore.monthly': score },
      $push: { badges: { type: 'top_contributor_monthly', awardedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000) } },
    });

    socketService.badgeEarned(user._id, { name: 'Top Contributor — Monthly', emoji: '🥈' });
    await pushService.sendToUser(user._id, pushService.buildBadgeNotification('Top Contributor — Monthly', '🥈'));

    // Top 3 get email and SMS
    if (i < 3) {
      await emailService.sendBadgeEarnedEmail(user, 'Top Contributor — Monthly', '🥈', `Ranked #${i + 1} this month`);
      if (user.phone) await smsService.sendBadgeEarnedSMS(user.phone, 'Top Contributor — Monthly');
    }
  }

  // Marketplace Champions
  const champThreshold = settings?.badges?.marketplaceChampionSales || 10;
  const champRating = settings?.badges?.marketplaceChampionRating || 4.5;

  await Badge.updateMany(
    { type: 'marketplace_champion', isActive: true },
    { isActive: false, revokedAt: new Date(), revokeReason: 'Monthly recalculation' }
  );

  for (const user of users) {
    const sales = await Listing.countDocuments({ seller: user._id, status: 'sold', updatedAt: { $gte: start, $lte: end } });
    if (sales >= champThreshold) {
      await Badge.create({
        user: user._id,
        type: 'marketplace_champion',
        name: 'Marketplace Champion',
        emoji: '💰',
        description: `${sales} items sold this month`,
        tier: 'monthly',
        awardedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86400000),
        isActive: true,
      });
      socketService.badgeEarned(user._id, { name: 'Marketplace Champion', emoji: '💰' });
    }
  }

  // Lost & Found Heroes
  const heroThreshold = settings?.badges?.lostFoundHeroReturns || 3;

  await Badge.updateMany(
    { type: 'lost_found_hero', isActive: true },
    { isActive: false, revokedAt: new Date(), revokeReason: 'Monthly recalculation' }
  );

  for (const user of users) {
    const returns = await Post.countDocuments({
      author: user._id,
      type: 'lost_found',
      status: 'claimed',
      updatedAt: { $gte: start, $lte: end },
    });
    if (returns >= heroThreshold) {
      await Badge.create({
        user: user._id,
        type: 'lost_found_hero',
        name: 'Campus Hero',
        emoji: '🦸',
        description: `Helped return ${returns} lost items`,
        tier: 'permanent',
        awardedAt: new Date(),
        isActive: true,
      });
      socketService.badgeEarned(user._id, { name: 'Campus Hero', emoji: '🦸' });
    }
  }

  // Department leaders
  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];

  await Badge.updateMany(
    { type: 'department_leader', tier: 'monthly', isActive: true },
    { isActive: false, revokedAt: new Date(), revokeReason: 'New month started' }
  );

  for (const dept of departments) {
    const deptUsers = scores.filter(s => s.user.department === dept);
    if (deptUsers.length > 0) {
      const leader = deptUsers[0];
      await Badge.create({
        user: leader.user._id,
        type: 'department_leader',
        name: `${dept.charAt(0).toUpperCase() + dept.slice(1)} Leader — Monthly`,
        emoji: '🏅',
        description: `Top contributor in ${dept} this month`,
        tier: 'monthly',
        awardedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86400000),
        isActive: true,
      });
    }
  }

  // Save leaderboard snapshot
  await Leaderboard.create({
    period: 'monthly',
    month,
    year,
    rankings: winners.map((w, i) => ({
      rank: i + 1,
      user: w.user._id,
      score: w.score,
      department: w.user.department,
    })),
    totalParticipants: scores.length,
    calculatedAt: new Date(),
  });

  logger.info(`Monthly awards done: ${winners.length} top contributors`);
};