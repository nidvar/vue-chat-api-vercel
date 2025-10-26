import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connectDB } from '../config/db.js';
import { routes } from '../routes/main.js';

dotenv.config();
connectDB();

const app = express();

const allowedOrigins = ['https://mevn-blog.vercel.app', 'http://localhost:5173'];

const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // for tools like Postman
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

routes(app);

export default app;
