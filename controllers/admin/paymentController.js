import Payment from '../../models/admin/Payment.js';
import User from '../../models/user/User.js';
import * as emailService from '../../services/emailService.js';
import * as smsService from '../../services/smsService.js';
import * as pushService from '../../services/pushService.js';
import * as socketService from '../../services/socketService.js';
import paginate from '../../utils/paginate.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

// GET /api/admin/payments
const getPayments = async (req, res, next) => {
  try {
    const { status, purpose, page, limit } = req.query;
    const query = {};
    if (status) query.status = status;
    if (purpose) query.purpose = purpose;

    const result = await paginate(Payment, query, {
      page, limit: limit || 30,
      sort: { createdAt: -1 },
      populate: 'user paymentMethod plan',
    });

    return success(res, { payments: result.data, pagination: result.pagination }, 'Payments retrieved');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/payments/:id
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('paymentMethod')
      .populate('plan');
    if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    return success(res, payment, 'Payment details');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/payments/:id/verify
const verifyPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    if (payment.status !== 'pending') throw new AppError('Payment is not pending', 400, 'NOT_PENDING');

    payment.status = 'paid';
    payment.verifiedBy = req.admin._id;
    await payment.save();

    const user = await User.findById(payment.user);
    if (user) {
      await emailService.sendPaymentConfirmationEmail(user, payment.amount, payment.purpose);
      socketService.emitToUser(user._id, 'payment:confirmed', { paymentId: payment._id, amount: payment.amount, purpose: payment.purpose });
    }

    logger.info(`Payment verified: ${payment._id} by admin ${req.admin._id}`);
    return success(res, payment, 'Payment verified');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/payments/:id/refund
const refundPayment = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    if (payment.status !== 'paid') throw new AppError('Only paid payments can be refunded', 400, 'CANNOT_REFUND');

    payment.status = 'refunded';
    payment.refundReason = reason || 'Refunded by admin';
    payment.refundedAt = new Date();
    await payment.save();

    const user = await User.findById(payment.user);
    if (user) {
      socketService.emitToUser(user._id, 'payment:refunded', { paymentId: payment._id, amount: payment.amount, reason });
    }

    logger.info(`Payment refunded: ${payment._id} by admin ${req.admin._id}`);
    return success(res, payment, 'Payment refunded');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/payments/transactions
const getTransactions = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await paginate(Payment, { status: { $in: ['paid', 'refunded'] } }, {
      page, limit: limit || 50,
      sort: { createdAt: -1 },
      populate: 'user',
    });
    return success(res, { transactions: result.data, pagination: result.pagination }, 'Transactions');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/payments/revenue
const getRevenue = async (req, res, next) => {
  try {
    const [total, thisMonth, thisWeek] = await Promise.all([
      Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: { status: 'paid', createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Payment.aggregate([{ $match: { status: 'paid', createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ]);

    return success(res, {
      allTime: total[0] || { total: 0, count: 0 },
      thisMonth: thisMonth[0] || { total: 0, count: 0 },
      thisWeek: thisWeek[0] || { total: 0, count: 0 },
    }, 'Revenue data');
  } catch (error) {
    next(error);
  }
};

export { getPayments, getPaymentById, verifyPayment, refundPayment, getTransactions, getRevenue };