import Payment from '../../models/admin/Payment.js';
import User from '../../models/user/User.js';
import Subscription from '../../models/user/Subscription.js';
import Plan from '../../models/admin/Plan.js';
import Badge from '../../models/user/Badge.js';
import * as emailService from '../../services/emailService.js';
import * as smsService from '../../services/smsService.js';
import * as pushService from '../../services/pushService.js';
import * as socketService from '../../services/socketService.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import { stkPush, queryTransaction } from '../../config/mpesa.js';
import logger from '../../utils/logger.js';

// POST /api/payments/mpesa/initiate
const initiateMpesaPayment = async (req, res, next) => {
  try {
    const { phone, amount, purpose, planId } = req.body;
    if (!phone || !amount) throw new AppError('Phone and amount are required', 400, 'MISSING_FIELDS');

    const payment = await Payment.create({
      user: req.user._id,
      amount,
      paymentMethodType: 'mpesa',
      purpose: purpose || 'plan_purchase',
      plan: planId || null,
      status: 'pending',
    });

    const result = await stkPush({
      phone,
      amount,
      accountReference: `RVNP-${payment._id.toString().slice(-6)}`,
      transactionDesc: purpose === 'verification_application' ? 'HDM Verification' : 'Plan Purchase',
    });

    if (!result.success) {
      payment.status = 'failed';
      payment.gatewayResponse = result.error;
      await payment.save();
      throw new AppError('Payment initiation failed', 500, 'MPESA_FAILED');
    }

    payment.transactionId = result.data.CheckoutRequestID;
    payment.gatewayResponse = result.data;
    await payment.save();

    return success(res, {
      paymentId: payment._id,
      checkoutRequestId: result.data.CheckoutRequestID,
      message: 'STK Push sent. Enter PIN to complete.',
    }, 'Payment initiated');
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/mpesa/callback
const mpesaCallback = async (req, res, next) => {
  try {
    const { Body } = req.body;
    if (!Body || !Body.stkCallback) {
      logger.error('Invalid M-Pesa callback:', req.body);
      return res.status(200).json({ ResultCode: 1, ResultDesc: 'Invalid' });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;

    const payment = await Payment.findOne({ transactionId: CheckoutRequestID });
    if (!payment) {
      logger.error(`Payment not found for CheckoutRequestID: ${CheckoutRequestID}`);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Not found' });
    }

    if (ResultCode === 0) {
      payment.status = 'paid';
      payment.mpesaReceipt = CallbackMetadata?.Item?.find(i => i.Name === 'MpesaReceiptNumber')?.Value || '';
      payment.mpesaPhone = CallbackMetadata?.Item?.find(i => i.Name === 'PhoneNumber')?.Value || '';
      await payment.save();

      const user = await User.findById(payment.user);

      if (payment.purpose === 'verification_application') {
        if (user) {
          await emailService.sendVerificationApplicationReceivedEmail(user);
          socketService.emitToUser(user._id, 'verification:applied', { status: 'paid' });
        }
      } else if (payment.purpose === 'plan_purchase' && payment.plan) {
        const plan = await Plan.findById(payment.plan);
        if (plan && user) {
          const expiresAt = plan.duration > 0 ? new Date(Date.now() + plan.duration * 86400000) : null;

          const subscription = await Subscription.create({
            user: user._id, plan: plan._id, planName: plan.name,
            status: 'active', startsAt: new Date(), expiresAt,
            autoRenew: false, payment: payment._id, amountPaid: payment.amount,
          });

          await User.findByIdAndUpdate(user._id, {
            plan: plan.slug.includes('pro') ? 'pro' : plan.slug.includes('elite') ? 'elite' : 'free',
            planExpiresAt: expiresAt,
            activeSubscription: subscription._id,
            maxListings: plan.maxListings,
            maxGroups: plan.maxGroups,
            prioritySupport: plan.prioritySupport,
            earlyFeatures: plan.earlyFeatures,
            customProfileRing: plan.customProfile ? 'ring-gold' : null,
          });

          if (plan.includesVerification && !user.hdmVerified) {
            user.hdmVerified = true;
            user.hdmVerifiedAt = new Date();
            await user.save();

            await Badge.create({
              user: user._id, type: 'hdm_verified',
              name: 'HDM Verified', emoji: '🔵',
              description: `Granted with ${plan.name} plan`,
              tier: 'permanent', awardedAt: new Date(), isActive: true,
            });

            await emailService.sendVerificationApprovedEmail(user);
            if (user.phone) await smsService.sendVerificationApprovedSMS(user.phone);
            socketService.emitToUser(user._id, 'verification:approved', { hdmVerified: true });
          }

          await emailService.sendPaymentConfirmationEmail(user, payment.amount, 'plan_purchase');
          socketService.emitToUser(user._id, 'subscription:activated', { plan: plan.name, expiresAt });
        }
      }

      logger.info(`M-Pesa payment confirmed: ${payment._id}`);
    } else {
      payment.status = 'failed';
      payment.gatewayResponse = { ResultCode, ResultDesc };
      await payment.save();
      logger.warn(`M-Pesa payment failed: ${payment._id} — ${ResultDesc}`);
    }

    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Processed' });
  } catch (error) {
    logger.error('M-Pesa callback error:', error);
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Error' });
  }
};

// GET /api/payments/verify/:transactionId
const verifyTransaction = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      $or: [
        { transactionId: req.params.transactionId },
        { _id: req.params.transactionId.match(/^[0-9a-fA-F]{24}$/) ? req.params.transactionId : null },
      ],
    });

    if (!payment) throw new AppError('Transaction not found', 404, 'NOT_FOUND');

    if (payment.paymentMethodType === 'mpesa' && payment.status === 'pending') {
      const result = await queryTransaction(payment.transactionId);
      if (result.success && result.data.ResultCode === '0') {
        payment.status = 'paid';
        await payment.save();
      }
    }

    return success(res, { status: payment.status, amount: payment.amount, purpose: payment.purpose }, 'Transaction status');
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/history
const getPaymentHistory = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('amount purpose status createdAt transactionId');

    return success(res, payments, 'Payment history');
  } catch (error) {
    next(error);
  }
};

export { initiateMpesaPayment, mpesaCallback, verifyTransaction, getPaymentHistory };