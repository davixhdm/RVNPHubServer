const verifiedOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errorCode: 'NO_USER',
    });
  }

  if (!req.user.hdmVerified) {
    return res.status(403).json({
      success: false,
      message: 'This feature requires HDM Verification. Apply for your blue tick in settings.',
      errorCode: 'NOT_VERIFIED',
    });
  }

  next();
};

export default verifiedOnly;