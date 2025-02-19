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

  app.set('trust proxy', 1); // Necesario para HTTPS en Vercel

  // Middlewares para parsear requests
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Configuración de cookie-session
  app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET],
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    signed: true
  }));

  // Añadir métodos de compatibilidad para Passport
  app.use((req, res, next) => {
    if (req.session && !req.session.regenerate) {
      req.session.regenerate = (callback) => {
        callback();
      };
    }
    if (req.session && !req.session.save) {
      req.session.save = (callback) => {
        callback();
      };
    }
    next();
  });

  // Configuración de Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configurar Passport antes de usar las rutas
  configurePassport();

  // Middleware para logging detallado
  app.use((req, res, next) => {
    console.log('Request:', {
      method: req.method,
      path: req.path,
      origin: req.headers.origin,
      host: req.headers.host,
      env: process.env.NODE_ENV,
      // Logging de credenciales configuradas
      googleClientID: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not Set',
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not Set',
      facebookAppID: process.env.FACEBOOK_APP_ID ? 'Set' : 'Not Set',
      facebookAppSecret: process.env.FACEBOOK_APP_SECRET ? 'Set' : 'Not Set',
      appleClientID: process.env.APPLE_CLIENT_ID ? 'Set' : 'Not Set',
      diditClientID: process.env.DIDIT_CLIENT_ID ? 'Set' : 'Not Set',
      diditClientSecret: process.env.DIDIT_CLIENT_SECRET ? 'Set' : 'Not Set',
      diditWebhookSecret: process.env.DIDIT_WEBHOOK_SECRET ? 'Set' : 'Not Set',
      // Estado de la sesión
      session: req.session ? 'Exists' : 'None',
      user: req.user ? 'Authenticated' : 'Not Authenticated'
    });

    // Log del usuario si está autenticado
    if (req.user) {
      console.log('Deserializando usuario:', {
        id: req.user.id,
        provider: req.user.provider,
        email: req.user.email,
        displayName: req.user.displayName
      });
    }

    next();
  });

  // Middleware para manejar errores de CORS
  app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
      console.error('CORS Error:', {
        origin: req.headers.origin,
        allowedOrigins
      });
      return res.status(403).json({ 
        error: 'CORS not allowed',
        origin: req.headers.origin
      });
    }
    next(err);
  });

  // Rutas de la API
  app.use('/api/auth', authRoutes);

  // Ruta de health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok',
      env: process.env.NODE_ENV,
      vercelUrl: process.env.VERCEL_URL,
      diditConfigured: !!(process.env.DIDIT_CLIENT_ID && process.env.DIDIT_CLIENT_SECRET)
    });
  });

  // Manejador global de errores
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    // Log detallado del error
    if (err.response) {
      console.error('Response Error:', {
        status: err.response.status,
        data: err.response.data,
        headers: err.response.headers
      });
    }
    res.status(500).json({ 
      error: err.message || 'Something went wrong!',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Iniciar servidor en desarrollo
  if (process.env.NODE_ENV === 'development') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('Environment:', process.env.NODE_ENV);
      console.log('Frontend URL:', process.env.FRONTEND_URL_DEV);
      console.log('Didit configured:', !!(process.env.DIDIT_CLIENT_ID && process.env.DIDIT_CLIENT_SECRET));
    });
  }

  return app;
};

export default createApp();