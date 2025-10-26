import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connectDB } from '../config/db.js';
import { routes } from '../routes/main.js';

dotenv.config();

console.log('JWT_SECRET set?', !!process.env.JWT_SECRET);
console.log('NODE_ENV:', process.env.NODE_ENV);

connectDB();

const app = express();

const allowedOrigins = ['https://mevn-blog.vercel.app', 'http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Wrap routes in try/catch to send errors to client
app.use((req, res, next) => {
  try {
    routes(app);
    next();
  } catch (err) {
    console.error('Route setup error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Catch unhandled routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Unexpected server error', details: err.message });
});

export default app;
