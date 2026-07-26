import jwt from 'jsonwebtoken';

const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    return { valid: true, decoded, error: null };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, decoded: null, error: 'Token expired' };
    }
    return { valid: false, decoded: null, error: 'Invalid token' };
  }
};

const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    return { valid: true, decoded, error: null };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, decoded: null, error: 'Refresh token expired' };
    }
    return { valid: false, decoded: null, error: 'Invalid refresh token' };
  }
};

export { verifyAccessToken, verifyRefreshToken };