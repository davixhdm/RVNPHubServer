import { sanitizeObject, removeMongoOperators } from '../../utils/sanitize.js';

const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
    req.body = removeMongoOperators(req.body);
  }

  next();
};

export default sanitizeBody;