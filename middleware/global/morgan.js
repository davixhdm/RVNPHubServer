import morgan from 'morgan';
import logger from '../../utils/logger.js';

const stream = {
  write: (message) => logger.http(message.trim()),
};

const skip = () => process.env.NODE_ENV === 'test';

const morganMiddleware = morgan(
  process.env.NODE_ENV === 'production'
    ? ':remote-addr - :method :url :status :res[content-length] - :response-time ms'
    : 'dev',
  { stream, skip }
);

export default morganMiddleware;