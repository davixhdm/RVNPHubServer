import { getJobStatuses, runJobManually, stopJob, restartJob } from '../../jobs/index.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

// GET /api/admin/jobs/status
const getJobStatus = async (req, res, next) => {
  try {
    const statuses = getJobStatuses();
    return success(res, statuses, 'Job statuses');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/jobs/trigger/:jobName
const triggerJob = async (req, res, next) => {
  try {
    const { jobName } = req.params;
    const result = await runJobManually(jobName);
    if (!result.success) throw new AppError(result.message || 'Job failed', 500, 'JOB_FAILED');
    logger.info(`Job triggered manually by admin ${req.admin._id}: ${jobName}`);
    return success(res, { duration: result.duration }, `Job '${jobName}' completed`);
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/jobs/restart/:jobName
const restartJobRoute = async (req, res, next) => {
  try {
    const { jobName } = req.params;
    const result = await restartJob(jobName);
    if (!result) throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
    logger.info(`Job restarted by admin ${req.admin._id}: ${jobName}`);
    return success(res, null, `Job '${jobName}' restarted`);
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/jobs/stop/:jobName
const stopJobRoute = async (req, res, next) => {
  try {
    const { jobName } = req.params;
    const result = stopJob(jobName);
    if (!result) throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
    logger.info(`Job stopped by admin ${req.admin._id}: ${jobName}`);
    return success(res, null, `Job '${jobName}' stopped`);
  } catch (error) {
    next(error);
  }
};

export { getJobStatus, triggerJob, restartJobRoute, stopJobRoute };