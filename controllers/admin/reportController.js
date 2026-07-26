import Report from '../../models/admin/Report.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';
import paginate from '../../utils/paginate.js';

// GET /api/admin/reports
const getReports = async (req, res, next) => {
  try {
    const { status, type, page, limit } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.reportType = type;

    const result = await paginate(Report, query, {
      page, limit: limit || 20,
      sort: { createdAt: -1 },
      populate: 'reportedBy assignedTo',
    });

    return success(res, result.data, 'Reports', 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/reports/:id
const getReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id).populate('reportedBy assignedTo');
    if (!report) throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    return success(res, report, 'Report details');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/reports/:id/resolve
const resolveReport = async (req, res, next) => {
  try {
    const { resolution, actionTaken } = req.body;
    const report = await Report.findByIdAndUpdate(req.params.id, {
      status: 'resolved',
      resolution: resolution || 'Resolved by admin',
      actionTaken: actionTaken || 'none',
    }, { new: true });

    if (!report) throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');

    logger.info(`Report resolved: ${report._id} by admin ${req.admin._id}`);
    return success(res, report, 'Report resolved');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/reports/:id/dismiss
const dismissReport = async (req, res, next) => {
  try {
    const { resolution } = req.body;
    const report = await Report.findByIdAndUpdate(req.params.id, {
      status: 'dismissed',
      resolution: resolution || 'Dismissed',
      actionTaken: 'none',
    }, { new: true });

    if (!report) throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');

    logger.info(`Report dismissed: ${report._id} by admin ${req.admin._id}`);
    return success(res, report, 'Report dismissed');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/reports/stats
const getReportStats = async (req, res, next) => {
  try {
    const [pending, underReview, resolved, dismissed, total] = await Promise.all([
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'under_review' }),
      Report.countDocuments({ status: 'resolved' }),
      Report.countDocuments({ status: 'dismissed' }),
      Report.countDocuments(),
    ]);

    return success(res, { pending, underReview, resolved, dismissed, total }, 'Report stats');
  } catch (error) {
    next(error);
  }
};

export { getReports, getReportById, resolveReport, dismissReport, getReportStats };