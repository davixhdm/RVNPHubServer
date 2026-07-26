const adminRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        errorCode: 'NO_ADMIN',
      });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
        errorCode: 'FORBIDDEN',
      });
    }

    next();
  };
};

export default adminRole;