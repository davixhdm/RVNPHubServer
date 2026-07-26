import Plan from '../../models/admin/Plan.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

// GET /api/admin/plans
const getPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find().sort({ sortOrder: 1 });
    return success(res, plans, 'Plans retrieved');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/plans/:id
const getPlanById = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    return success(res, plan, 'Plan details');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/plans
const createPlan = async (req, res, next) => {
  try {
    const plan = await Plan.create({ ...req.body, createdBy: req.admin._id });
    logger.info(`Plan created: ${plan.name} by admin ${req.admin._id}`);
    return created(res, plan, 'Plan created');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/plans/:id
const updatePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    logger.info(`Plan updated: ${plan.name} by admin ${req.admin._id}`);
    return success(res, plan, 'Plan updated');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/plans/:id
const deletePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    logger.info(`Plan deleted: ${plan.name} by admin ${req.admin._id}`);
    return success(res, null, 'Plan deleted');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/plans/:id/toggle
const togglePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    plan.isActive = !plan.isActive;
    await plan.save();
    logger.info(`Plan toggled: ${plan.name} -> ${plan.isActive ? 'active' : 'inactive'} by admin ${req.admin._id}`);
    return success(res, plan, `Plan ${plan.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    next(error);
  }
};

export { getPlans, getPlanById, createPlan, updatePlan, deletePlan, togglePlan };