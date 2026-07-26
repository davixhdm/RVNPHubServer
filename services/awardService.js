import User from '../models/user/User.js';
import Badge from '../models/user/Badge.js';
import { calculateUserScore } from '../utils/calculateScore.js';
import { getWeekRange, getMonthRange } from '../utils/formatDate.js';
import getSettings from '../utils/getSettings.js';
import * as emailService from './emailService.js';
import * as smsService from './smsService.js';
import * as pushService from './pushService.js';
import * as socketService from './socketService.js';
import logger from '../utils/logger.js';

export const calculateWeeklyAwards = async () => {
  logger.info('Calculating weekly awards...');
  const settings = await getSettings();
  const { start, end } = getWeekRange();
  const topCount = settings?.badges?.topContributorWeeklyCount || 10;

  const users = await User.find({ isBanned: false });
  const scores = [];

  for (const user of users) {
    const { score } = await calculateUserScore(user._id, start, end);
    if (score > 0) scores.push({ user, score });
  }

  scores.sort((a, b) => b.score - a.score);
  const winners = scores.slice(0, topCount);

  for (const winner of winners) {
    await awardBadge(winner.user._id, 'top_contributor_weekly', {
      name: 'Top Contributor — Weekly',
      emoji: '🥇',
      description: `Scored ${winner.score} points this week`,
      tier: 'weekly',
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });
  }

  logger.info(`Weekly awards calculated: ${winners.length} winners`);
  return winners;
};

export const calculateMonthlyAwards = async () => {
  logger.info('Calculating monthly awards...');
  const settings = await getSettings();
  const { start, end } = getMonthRange();
  const topCount = settings?.badges?.topContributorMonthlyCount || 20;

  const users = await User.find({ isBanned: false });
  const scores = [];

  for (const user of users) {
    const { score } = await calculateUserScore(user._id, start, end);
    if (score > 0) scores.push({ user, score });
  }

  scores.sort((a, b) => b.score - a.score);
  const winners = scores.slice(0, topCount);

  for (let i = 0; i < winners.length; i++) {
    const winner = winners[i];
    await awardBadge(winner.user._id, 'top_contributor_monthly', {
      name: 'Top Contributor — Monthly',
      emoji: '🥈',
      description: `Ranked #${i + 1} this month with ${winner.score} points`,
      tier: 'monthly',
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });

    // Email digest for top 3
    if (i < 3) {
      const user = winner.user;
      await emailService.sendBadgeEarnedEmail(user, 'Top Contributor — Monthly', '🥈', `Ranked #${i + 1} this month`);
      if (user.phone) {
        await smsService.sendBadgeEarnedSMS(user.phone, 'Top Contributor — Monthly');
      }
    }
  }

  logger.info(`Monthly awards calculated: ${winners.length} winners`);
  return winners;
};

export const awardBadge = async (userId, type, badgeData) => {
  try {
    const existing = await Badge.findOne({ user: userId, type, isActive: true });
    if (existing) return existing;

    const badge = await Badge.create({
      user: userId,
      type,
      name: badgeData.name,
      emoji: badgeData.emoji,
      description: badgeData.description,
      tier: badgeData.tier || 'permanent',
      awardedAt: new Date(),
      expiresAt: badgeData.expiresAt || null,
      isActive: true,
    });

    await User.findByIdAndUpdate(userId, {
      $push: { badges: { type, awardedAt: new Date(), expiresAt: badgeData.expiresAt || null } },
    });

    const user = await User.findById(userId);
    socketService.badgeEarned(userId, badge);
    await pushService.sendToUser(userId, pushService.buildBadgeNotification(badgeData.name, badgeData.emoji));

    logger.info(`Badge awarded: ${badgeData.name} to ${user?.firstName}`);
    return badge;
  } catch (error) {
    logger.error('awardBadge failed:', error);
    return null;
  }
};

export const revokeBadge = async (userId, type) => {
  try {
    await Badge.updateMany({ user: userId, type, isActive: true }, { isActive: false, revokedAt: new Date() });
    await User.findByIdAndUpdate(userId, {
      $pull: { badges: { type } },
    });
    logger.info(`Badge revoked: ${type} from ${userId}`);
  } catch (error) {
    logger.error('revokeBadge failed:', error);
  }
};