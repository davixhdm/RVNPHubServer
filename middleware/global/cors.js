import cors from 'cors';

const getCorsOrigins = () => {
  const origins = process.env.CORS_ORIGINS || '';
  return origins.split(',').map(o => o.trim()).filter(Boolean);
};

const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowedOrigins = getCorsOrigins();

    // Allow requests with no origin (server-to-server, curl, mobile apps)
    if (!origin) {
      return callback(null, true);
    }

    // Allow all in development if no origins configured
    if (process.env.NODE_ENV === 'development' && allowedOrigins.length === 0) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  optionsSuccessStatus: 204,
});

export default corsMiddleware;