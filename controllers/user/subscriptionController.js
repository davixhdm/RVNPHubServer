import Plan from '../../models/admin/Plan.js';
import PaymentMethod from '../../models/admin/PaymentMethod.js';
import Subscription from '../../models/user/Subscription.js';
import Payment from '../../models/admin/Payment.js';
import User from '../../models/user/User.js';
import Badge from '../../models/user/Badge.js';
import * as emailService from '../../services/emailService.js';
import * as smsService from '../../services/smsService.js';
import * as socketService from '../../services/socketService.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import getSettings from '../../utils/getSettings.js';
import logger from '../../utils/logger.js';

// GET /api/subscriptions/plans
const getPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 }).select('-createdBy');
    return success(res, plans, 'Available plans');
  } catch (error) {
    next(error);
  }
};

// GET /api/subscriptions/me
const getMySubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id, status: 'active' }).populate('plan');
    return success(res, subscription, 'My subscription');
  } catch (error) {
    next(error);
  }
};

// POST /api/subscriptions
const subscribe = async (req, res, next) => {
  try {
    const { planId, paymentMethodId } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan) throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');

    const payment = await Payment.create({ user: req.user._id, amount: plan.price, paymentMethod: paymentMethodId, purpose: 'plan_purchase', plan: plan._id, status: 'pending' });

    const expiresAt = plan.duration > 0 ? new Date(Date.now() + plan.duration * 86400000) : null;
    const subscription = await Subscription.create({ user: req.user._id, plan: plan._id, planName: plan.name, status: 'active', startsAt: new Date(), expiresAt, payment: payment._id, amountPaid: plan.price });

    await User.findByIdAndUpdate(req.user._id, {
      plan: plan.slug.includes('pro') ? 'pro' : 'elite',
      planExpiresAt: expiresAt,
      activeSubscription: subscription._id,
      maxListings: plan.maxListings,
      maxGroups: plan.maxGroups,
      prioritySupport: plan.prioritySupport,
      earlyFeatures: plan.earlyFeatures,
    });

    if (plan.includesVerification && !req.user.hdmVerified) {
      await User.findByIdAndUpdate(req.user._id, { hdmVerified: true, hdmVerifiedAt: new Date() });
      await Badge.create({ user: req.user._id, type: 'hdm_verified', name: 'HDM Verified', emoji: '🔵', description: `Granted with ${plan.name}`, tier: 'permanent', isActive: true });
      await emailService.sendVerificationApprovedEmail(req.user);
      socketService.emitToUser(req.user._id, 'verification:approved', { hdmVerified: true });
    }

    socketService.emitToUser(req.user._id, 'subscription:activated', { plan: plan.name, expiresAt });
    return created(res, { subscription, payment }, 'Subscribed');
  } catch (error) {
    next(error);
  }
};

// POST /api/subscriptions/cancel
const cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOneAndUpdate({ user: req.user._id, status: 'active' }, { status: 'cancelled', cancelledAt: new Date(), cancelReason: req.body.reason }, { new: true });
    if (!subscription) throw new AppError('No active subscription', 404, 'NOT_FOUND');
    return success(res, subscription, 'Subscription cancelled');
  } catch (error) {
    next(error);
  }
};

// GET /api/subscriptions/payment-methods
const getPaymentMethods = async (req, res, next) => {
  try {
    const methods = await PaymentMethod.find({ isActive: true }).select('name slug type instructions config');
    return success(res, methods, 'Payment methods');
  } catch (error) {
    next(error);
  }
};

// GET /api/subscriptions/billing
const getBillingHistory = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id, purpose: { $in: ['plan_purchase', 'plan_renewal'] } }).sort({ createdAt: -1 }).populate('plan', 'name');
    return success(res, payments, 'Billing history');
  } catch (error) {
    next(error);
  }
};

export { getPlans, getMySubscription, subscribe, cancelSubscription, getPaymentMethods, getBillingHistory };