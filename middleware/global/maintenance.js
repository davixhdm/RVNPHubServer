import getSettings from '../../utils/getSettings.js';

const maintenanceMiddleware = async (req, res, next) => {
  try {
    const settings = await getSettings();

    if (!settings?.toggles?.maintenanceMode) {
      return next();
    }

    // Allow admin panel requests
    if (req.originalUrl.startsWith('/api/admin')) {
      return next();
    }

    // Allow health check
    if (req.originalUrl === '/api/health') {
      return next();
    }

    // Allow specific IPs (localhost for dev)
    const allowedIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    if (allowedIPs.includes(req.ip)) {
      return next();
    }

    return res.status(503).json({
      success: false,
      message: settings?.general?.maintenanceMessage || 'RVNP Campus Hub is under maintenance. We will be back shortly.',
      errorCode: 'MAINTENANCE_MODE',
    });
  } catch (error) {
    return next();
  }
};

export default maintenanceMiddleware;