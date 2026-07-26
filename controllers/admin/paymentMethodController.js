import PaymentMethod from '../../models/admin/PaymentMethod.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

// GET /api/admin/payment-methods
const getPaymentMethods = async (req, res, next) => {
  try {
    const methods = await PaymentMethod.find().sort({ isDefault: -1, createdAt: 1 });
    return success(res, methods, 'Payment methods retrieved');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/payment-methods/:id
const getPaymentMethodById = async (req, res, next) => {
  try {
    const method = await PaymentMethod.findById(req.params.id);
    if (!method) throw new AppError('Payment method not found', 404, 'NOT_FOUND');
    return success(res, method, 'Payment method details');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/payment-methods
const createPaymentMethod = async (req, res, next) => {
  try {
    const method = await PaymentMethod.create(req.body);
    logger.info(`Payment method created: ${method.name} by admin ${req.admin._id}`);
    return created(res, method, 'Payment method created');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/payment-methods/:id
const updatePaymentMethod = async (req, res, next) => {
  try {
    const method = await PaymentMethod.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!method) throw new AppError('Payment method not found', 404, 'NOT_FOUND');
    logger.info(`Payment method updated: ${method.name} by admin ${req.admin._id}`);
    return success(res, method, 'Payment method updated');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/payment-methods/:id
const deletePaymentMethod = async (req, res, next) => {
  try {
    const method = await PaymentMethod.findByIdAndDelete(req.params.id);
    if (!method) throw new AppError('Payment method not found', 404, 'NOT_FOUND');
    logger.info(`Payment method deleted: ${method.name} by admin ${req.admin._id}`);
    return success(res, null, 'Payment method deleted');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/payment-methods/:id/toggle
const togglePaymentMethod = async (req, res, next) => {
  try {
    const method = await PaymentMethod.findById(req.params.id);
    if (!method) throw new AppError('Payment method not found', 404, 'NOT_FOUND');
    method.isActive = !method.isActive;
    await method.save();
    return success(res, method, `Payment method ${method.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    next(error);
  }
};

export { getPaymentMethods, getPaymentMethodById, createPaymentMethod, updatePaymentMethod, deletePaymentMethod, togglePaymentMethod };