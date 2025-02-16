// index.js
import * as process from 'process';
import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
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

  // Reemplazar express-session con cookie-session
  app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET],
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }));

  // Configuración adicional para Passport
  app.use((req, res, next) => {
    if (req.session && !req.session.regenerate) {
      req.session.regenerate = (cb) => {
        cb();
      };
    }
    if (req.session && !req.session.save) {
      req.session.save = (cb) => {
        cb();
      };
    }
    next();
  });

  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configurar Passport antes de usar las rutas
  configurePassport();

  app.use((req, res, next) => {
    console.log('Request:', {
      method: req.method,
      path: req.path,
      origin: req.headers.origin,
      host: req.headers.host,
      env: process.env.NODE_ENV,
      clientID: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not Set',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not Set'
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
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Something went wrong!' });
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