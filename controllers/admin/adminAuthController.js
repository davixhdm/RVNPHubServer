import Admin from '../../models/admin/Admin.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/generateToken.js';
import { verifyRefreshToken } from '../../utils/verifyToken.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

// POST /api/admin/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_FIELDS');
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!admin.isActive) {
      throw new AppError('Account is deactivated. Contact super admin.', 403, 'ACCOUNT_INACTIVE');
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const accessToken = generateAccessToken(admin._id, admin.role);
    const refreshToken = generateRefreshToken(admin._id);

    admin.refreshToken = refreshToken;
    admin.lastLogin = new Date();
    await admin.save();

    return success(res, {
      admin: admin.toJSON(),
      accessToken,
      refreshToken,
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/auth/logout
const logout = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (admin) {
      admin.refreshToken = null;
      await admin.save();
    }
    return success(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/auth/refresh
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new AppError('Refresh token required', 400, 'MISSING_TOKEN');
    }

    const { valid, decoded, error } = verifyRefreshToken(token);
    if (!valid) {
      throw new AppError(error, 401, 'INVALID_TOKEN');
    }

    const admin = await Admin.findById(decoded.userId);
    if (!admin || admin.refreshToken !== token) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }

    const newAccessToken = generateAccessToken(admin._id, admin.role);
    const newRefreshToken = generateRefreshToken(admin._id);

    admin.refreshToken = newRefreshToken;
    await admin.save();

    return success(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/auth/me
const getMe = async (req, res, next) => {
  try {
    return success(res, { admin: req.admin.toJSON() }, 'Admin profile');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const admin = await Admin.findById(req.admin._id);

    if (name) admin.name = name;
    if (avatar) admin.avatar = avatar;
    await admin.save();

    return success(res, { admin: admin.toJSON() }, 'Profile updated');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/auth/password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current and new password are required', 400, 'MISSING_FIELDS');
    }

    if (newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400, 'WEAK_PASSWORD');
    }

    const admin = await Admin.findById(req.admin._id);
    const isMatch = await admin.comparePassword(currentPassword);

    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400, 'WRONG_PASSWORD');
    }

    admin.password = newPassword;
    admin.refreshToken = null;
    await admin.save();

    return success(res, null, 'Password changed successfully. Please login again.');
  } catch (error) {
    next(error);
  }
};

export { login, logout, refreshToken, getMe, updateProfile, changePassword };