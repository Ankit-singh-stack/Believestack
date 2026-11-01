import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import publicRoutes from './src/routes/public.js';
import adminRoutes from './src/routes/admin.js';

dotenv.config();

const app = express();
const configuredOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? configuredOrigins
  : [...new Set([...configuredOrigins, 'http://localhost:5173', 'http://127.0.0.1:5173'])];

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use('/api', publicRoutes);
app.use('/api/admin', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path !== '/auth/login',
}), adminRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'BELIEVE STACK API is running.' });
});

app.use((err, req, res, next) => {
  if (err.message === 'Origin is not allowed by CORS.') {
    return res.status(403).json({ success: false, message: 'Origin is not allowed.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Request body contains invalid JSON.' });
  }
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'A record with that value already exists.' });
  }
  if (err.code === '23503') {
    return res.status(409).json({ success: false, message: 'This record is still referenced by another record.' });
  }
  if (err.code === '23514') {
    return res.status(400).json({ success: false, message: 'The supplied data violates a database constraint.' });
  }
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ success: false, message: err.message, ...(err.details ? { details: err.details } : {}) });
  }
  console.error('Unhandled API error:', err);
  return res.status(500).json({ success: false, message: 'Something went wrong on the server.' });
});

export default app;
