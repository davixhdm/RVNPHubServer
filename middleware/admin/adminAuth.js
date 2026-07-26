import { verifyAccessToken } from '../../utils/verifyToken.js';
import Admin from '../../models/admin/Admin.js';
import logger from '../../utils/logger.js';

const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        errorCode: 'NO_TOKEN',
      });
    }

    const token = authHeader.split(' ')[1];
    const { valid, decoded, error } = verifyAccessToken(token);

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: error,
        errorCode: 'INVALID_TOKEN',
      });
    }

    const admin = await Admin.findById(decoded.userId).select('-password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found',
        errorCode: 'ADMIN_NOT_FOUND',
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
        errorCode: 'ACCOUNT_INACTIVE',
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    logger.error('Admin auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      errorCode: 'AUTH_ERROR',
    });
  }
};

export default adminAuth;