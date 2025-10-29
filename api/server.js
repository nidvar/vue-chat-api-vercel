import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connectDB } from '../config/db.js';
import { routes } from '../routes/main.js';

dotenv.config();
connectDB();

const app = express();

// Allowed origins: local dev + any Vercel subdomain + your production domain
const allowedOrigins = [
  'http://localhost:5173',
  new RegExp('\\.vercel\\.app$'),
  new RegExp('^https://mevn-blog\\.vercel\\.app$')
];

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (server-to-server, curl)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some((o) => {
        if (typeof o === 'string') return o === origin;
        if (o instanceof RegExp) return o.test(origin);
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`❌ CORS blocked for origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Handle preflight OPTIONS requests for all routes
app.options('*', cors());

// Middleware
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Global error handler for CORS errors
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS denied', origin: req.headers.origin });
  }
  next(err);
});

// Register routes
routes(app);

export default app;
