import { verifyAccessToken } from '../../utils/verifyToken.js';
import User from '../../models/user/User.js';
import logger from '../../utils/logger.js';

const auth = (options = {}) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (options.optional) {
          req.user = null;
          return next();
        }

        return res.status(401).json({
          success: false,
          message: 'Access token required',
          errorCode: 'NO_TOKEN',
        });
      }

      const token = authHeader.split(' ')[1];
      const { valid, decoded, error } = verifyAccessToken(token);

      if (!valid) {
        if (options.optional) {
          req.user = null;
          return next();
        }

        return res.status(401).json({
          success: false,
          message: error,
          errorCode: 'INVALID_TOKEN',
        });
      }

      const user = await User.findById(decoded.userId).select('-password -refreshToken');

      if (!user) {
        if (options.optional) {
          req.user = null;
          return next();
        }

        return res.status(401).json({
          success: false,
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        });
      }

      if (user.isBanned) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been permanently banned',
          errorCode: 'ACCOUNT_BANNED',
        });
      }

      if (user.isSuspended && user.suspensionExpiresAt && user.suspensionExpiresAt > new Date()) {
        return res.status(403).json({
          success: false,
          message: `Your account is suspended until ${user.suspensionExpiresAt.toISOString()}`,
          errorCode: 'ACCOUNT_SUSPENDED',
          suspensionReason: user.suspensionReason,
          suspensionExpiresAt: user.suspensionExpiresAt,
        });
      }

      req.user = user;
      next();
    } catch (error) {
      logger.error('User auth error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authentication failed',
        errorCode: 'AUTH_ERROR',
      });
    }
  };
};

export default auth;