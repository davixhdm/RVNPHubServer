import Plan from '../../models/admin/Plan.js';
import PaymentMethod from '../../models/admin/PaymentMethod.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';

// GET /api/plans
const getPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 }).select('-createdBy');
    return success(res, plans, 'Available plans');
  } catch (error) {
    next(error);
  }
};

// GET /api/plans/:slug
const getPlanBySlug = async (req, res, next) => {
  try {
    const plan = await Plan.findOne({ slug: req.params.slug, isActive: true }).select('-createdBy');
    if (!plan) throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    return success(res, plan, 'Plan details');
  } catch (error) {
    next(error);
  }
};

// GET /api/plans/payment-methods
const getActivePaymentMethods = async (req, res, next) => {
  try {
    const methods = await PaymentMethod.find({ isActive: true }).select('name slug type instructions config');
    return success(res, methods, 'Available payment methods');
  } catch (error) {
    next(error);
  }
};

export { getPlans, getPlanBySlug, getActivePaymentMethods };