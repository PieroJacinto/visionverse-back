import * as process from 'process';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { configurePassport } from './config/passport.js';
import authRoutes from './routes/auth.js';
import dotenv from 'dotenv';

dotenv.config();

export const createApp = () => {
  const app = express();
  
  const allowedOrigins = [
    process.env.FRONTEND_URL_PROD,
    process.env.FRONTEND_URL_DEV,
    'https://visionverse-front.vercel.app',
    'https://visionverse-front-pierojacintos-projects.vercel.app',
    'http://localhost:5173' 
  ];
  
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('Origin not allowed:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));
  app.use(express.json());

  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    },
    proxy: process.env.NODE_ENV === 'production'
  }));

  app.use(passport.initialize());
  app.use(passport.session());
  configurePassport();

  app.use((req, res, next) => {
    console.log('Request:', {
      method: req.method,
      path: req.path,
      origin: req.headers.origin,
      host: req.headers.host
    });
    next();
  });

  app.use('/api/auth', authRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok',
      env: process.env.NODE_ENV,
      vercelUrl: process.env.VERCEL_URL 
    });
  });

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });

  if (process.env.NODE_ENV === 'development') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('Environment:', process.env.NODE_ENV);
    });
  }

  return app;
};

export default createApp();