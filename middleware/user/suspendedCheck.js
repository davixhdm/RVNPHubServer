const suspendedCheck = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errorCode: 'NO_USER',
    });
  }

  if (req.user.isBanned) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been permanently banned',
      errorCode: 'ACCOUNT_BANNED',
    });
  }

  if (req.user.isSuspended && req.user.suspensionExpiresAt && req.user.suspensionExpiresAt > new Date()) {
    return res.status(403).json({
      success: false,
      message: `Your account is suspended until ${req.user.suspensionExpiresAt.toISOString()}`,
      errorCode: 'ACCOUNT_SUSPENDED',
      reason: req.user.suspensionReason,
      expiresAt: req.user.suspensionExpiresAt,
    });
  }

  next();
};

export default suspendedCheck;