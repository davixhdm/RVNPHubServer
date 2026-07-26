import AdminLog from '../../models/admin/AdminLog.js';
import logger from '../../utils/logger.js';

const adminActivityLogger = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (body) {
    if (req.admin && req.method !== 'GET') {
      const logEntry = {
        adminId: req.admin._id,
        adminEmail: req.admin.email,
        action: extractAction(req),
        target: req.params.id || req.body?.userId || null,
        details: extractDetails(req, body),
        ip: req.ip,
        endpoint: req.originalUrl,
        method: req.method,
        metadata: {
          params: req.params,
          query: req.query,
        },
      };

      AdminLog.create(logEntry).catch(err => {
        logger.error('Failed to create admin log:', err);
      });
    }

    return originalJson.call(this, body);
  };

  next();
};

const extractAction = (req) => {
  const url = req.originalUrl;
  const method = req.method;

  if (url.includes('/verify')) return 'grant-verification';
  if (url.includes('/unverify')) return 'revoke-verification';
  if (url.includes('/suspend')) return 'suspend-user';
  if (url.includes('/unsuspend')) return 'unsuspend-user';
  if (url.includes('/ban')) return 'ban-user';
  if (url.includes('/unban')) return 'unban-user';
  if (url.includes('/moderation')) return 'moderate-content';
  if (url.includes('/spotlight')) return 'manage-spotlight';
  if (url.includes('/announcement')) return 'manage-announcement';
  if (url.includes('/settings')) return 'update-settings';
  if (url.includes('/backup')) return 'manage-backup';
  if (url.includes('/jobs')) return 'manage-jobs';
  if (url.includes('/tickets')) return 'manage-tickets';
  if (url.includes('/reports')) return 'manage-reports';

  if (method === 'POST') return 'create';
  if (method === 'PATCH' || method === 'PUT') return 'update';
  if (method === 'DELETE') return 'delete';

  return 'view';
};

const extractDetails = (req, body) => {
  if (body?.message) return body.message;
  if (req.body?.reason) return `Reason: ${req.body.reason}`;
  return null;
};

export default adminActivityLogger;