import mongoose from 'mongoose';

const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}: ${id}`,
        errorCode: 'INVALID_OBJECT_ID',
      });
    }

    next();
  };
};

export default validateObjectId;