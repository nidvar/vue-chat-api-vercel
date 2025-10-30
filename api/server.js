import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connectDB } from '../config/db.js';
import { routes } from '../routes/main.js';

dotenv.config();
connectDB();

const app = express();

// Allowed origins
const allowedOrigins = [
  'http://localhost:5173', 
  'https://mevn-blog.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests or curl (no origin)
    if (!origin) return callback(null, true);

    // Check if origin matches any allowed
    if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    console.warn('❌ CORS blocked for origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Always handle preflight requests
app.options('*', cors({ credentials: true, origin: true }));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

routes(app);

export default app;
