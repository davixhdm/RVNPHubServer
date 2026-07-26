import User from '../models/user/User.js';
import Subscription from '../models/user/Subscription.js';
import Plan from '../models/admin/Plan.js';
import * as emailService from '../services/emailService.js';
import * as pushService from '../services/pushService.js';
import * as socketService from '../services/socketService.js';
import logger from '../utils/logger.js';

export const checkSubscriptions = async () => {
  logger.info('Checking subscriptions...');

  const today = new Date();
  let expiredCount = 0;
  let expiringCount = 0;
  let notifiedCount = 0;

  try {
    // 1. Expire subscriptions past their end date
    const expired = await Subscription.updateMany(
      {
        status: 'active',
        expiresAt: { $lt: today },
      },
      { status: 'expired' }
    );
    expiredCount = expired.modifiedCount;

    // 2. Find users whose subscription just expired and downgrade them
    const expiredSubs = await Subscription.find({
      status: 'expired',
      expiresAt: {
        $gte: new Date(today.getTime() - 24 * 60 * 60 * 1000),
        $lt: today,
      },
    }).populate('user');

    for (const sub of expiredSubs) {
      if (sub.user) {
        const freePlan = await Plan.findOne({ slug: 'hdm-free' });

        await User.findByIdAndUpdate(sub.user._id, {
          plan: 'free',
          planExpiresAt: null,
          activeSubscription: null,
          maxListings: freePlan?.maxListings || 5,
          maxGroups: freePlan?.maxGroups || 5,
          prioritySupport: false,
          earlyFeatures: false,
          customProfileRing: null,
          hdmVerified: false,
          hdmVerifiedAt: null,
        });

        // Notify user
        socketService.emitToUser(sub.user._id, 'subscription:expired', {
          message: 'Your plan has expired. Renew to restore premium features.',
        });

        await pushService.sendToUser(sub.user._id, {
          title: 'Subscription Expired',
          body: 'Your plan has expired. Renew to restore premium features.',
          data: { type: 'subscription_expired' },
        });

        await emailService.sendSubscriptionExpiredEmail(sub.user, sub.planName);
        notifiedCount++;
      }
    }

    // 3. Notify users whose subscription expires in 3 days
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const threeDaysFromNowEnd = new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000);

    const expiringSoon = await Subscription.find({
      status: 'active',
      expiresAt: {
        $gte: threeDaysFromNow,
        $lt: threeDaysFromNowEnd,
      },
      autoRenew: false,
    }).populate('user');

    for (const sub of expiringSoon) {
      if (sub.user) {
        expiringCount++;

        socketService.emitToUser(sub.user._id, 'subscription:expiringSoon', {
          message: `Your ${sub.planName} plan expires in 3 days. Renew now.`,
          expiresAt: sub.expiresAt,
        });

        await pushService.sendToUser(sub.user._id, {
          title: 'Subscription Expiring Soon',
          body: `Your ${sub.planName} plan expires in 3 days.`,
          data: { type: 'subscription_expiring' },
        });

        await emailService.sendSubscriptionExpiringEmail(sub.user, sub.planName, sub.expiresAt);
        notifiedCount++;
      }
    }

    // 4. Notify users whose subscription expires tomorrow
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

    const expiringTomorrow = await Subscription.find({
      status: 'active',
      expiresAt: {
        $gte: tomorrow,
        $lt: tomorrowEnd,
      },
      autoRenew: false,
    }).populate('user');

    for (const sub of expiringTomorrow) {
      if (sub.user) {
        expiringCount++;

        socketService.emitToUser(sub.user._id, 'subscription:expiringTomorrow', {
          message: `Your ${sub.planName} plan expires tomorrow. Renew now to keep your benefits.`,
          expiresAt: sub.expiresAt,
        });

        await pushService.sendToUser(sub.user._id, {
          title: 'Subscription Expires Tomorrow',
          body: `Your ${sub.planName} plan expires tomorrow. Renew now.`,
          data: { type: 'subscription_expiring' },
        });

        notifiedCount++;
      }
    }

    // 5. Auto-renew subscriptions where enabled
    const autoRenewDue = await Subscription.find({
      status: 'active',
      autoRenew: true,
      expiresAt: {
        $gte: today,
        $lt: new Date(today.getTime() + 6 * 60 * 60 * 1000),
      },
    }).populate('user plan');

    for (const sub of autoRenewDue) {
      if (sub.user && sub.plan) {
        const newExpiry = new Date(today.getTime() + sub.plan.duration * 24 * 60 * 60 * 1000);

        await Subscription.create({
          user: sub.user._id,
          plan: sub.plan._id,
          planName: sub.plan.name,
          status: 'active',
          startsAt: today,
          expiresAt: sub.plan.duration > 0 ? newExpiry : null,
          autoRenew: true,
          paymentMethod: sub.paymentMethod,
          amountPaid: sub.plan.price,
        });

        await User.findByIdAndUpdate(sub.user._id, {
          plan: sub.plan.slug === 'hdm-pro-monthly' || sub.plan.slug === 'hdm-pro-yearly' ? 'pro' : 'elite',
          planExpiresAt: sub.plan.duration > 0 ? newExpiry : null,
          activeSubscription: sub._id,
        });

        socketService.emitToUser(sub.user._id, 'subscription:renewed', {
          planName: sub.plan.name,
          expiresAt: newExpiry,
        });

        logger.info(`Auto-renewed: ${sub.user.email} — ${sub.plan.name}`);
      }
    }

    logger.info(
      `Subscription check: ${expiredCount} expired, ${expiringCount} expiring soon, ${notifiedCount} notified`
    );

    return { expiredCount, expiringCount, notifiedCount };
  } catch (error) {
    logger.error('Subscription check failed:', error);
    return { expiredCount: 0, expiringCount: 0, notifiedCount: 0 };
  }
};