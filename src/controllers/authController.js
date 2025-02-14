import passport from 'passport';
import * as process from 'process';

const getURLs = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendURL = isProduction 
    ? process.env.FRONTEND_URL_PROD 
    : process.env.FRONTEND_URL_DEV;
  
  const baseURL = isProduction 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';
    
  return {
    frontendURL,
    callbackURL: `${baseURL}/api/auth/google/callback`
  };
};

class AuthController {
  checkAuth(req, res) {
    console.log('Verificando autenticación:', req.isAuthenticated());
    console.log('Usuario en sesión:', req.user);
    
    if (req.isAuthenticated() && req.user) {
      res.json({
        isAuthenticated: true,
        user: {
          email: req.user.email,
          displayName: req.user.displayName
        }
      });
    } else {
      res.json({ isAuthenticated: false });
    }
  }

  initiateGoogleAuth(req, res, next) {
    console.log('Iniciando autenticación con Google');
    const { callbackURL } = getURLs();
    console.log('Using callback URL:', callbackURL);
    
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      callbackURL
    })(req, res, next);
  }

  handleGoogleCallback(req, res, next) {
    console.log('Callback de Google recibido');
    const { frontendURL, callbackURL } = getURLs();
    
    passport.authenticate('google', {
      callbackURL
    }, (err, user, info) => {
      if (err) {
        console.error('Error en autenticación:', err);
        return res.redirect(`${frontendURL}/login?error=auth_failed`);
      }
      
      if (!user) {
        console.log('No se encontró usuario');
        return res.redirect(`${frontendURL}/login?error=unauthorized`);
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error('Error en login:', err);
          return res.redirect(`${frontendURL}/login?error=auth_failed`);
        }
        
        console.log('Usuario autenticado exitosamente, redirigiendo a welcome');
        return res.redirect(`${frontendURL}/welcome`);
      });
    })(req, res, next);
  }

  logout(req, res) {
    req.logout(() => {
      const { frontendURL } = getURLs();
      res.json({ success: true, redirectUrl: `${frontendURL}/login` });
    });
  }
}

export default new AuthController();