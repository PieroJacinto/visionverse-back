import passport from 'passport';
import * as process from 'process';

const getURLs = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    frontendURL: isProduction 
      ? process.env.FRONTEND_URL_PROD 
      : process.env.FRONTEND_URL_DEV,
    callbackURL: isProduction 
      ? 'https://visionverse-back.vercel.app/api/auth/google/callback'
      : 'http://localhost:3000/api/auth/google/callback'
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
    const callbackURL = process.env.NODE_ENV === 'production'
      ? 'https://visionverse-back.vercel.app/api/auth/google/callback'
      : 'http://localhost:3000/api/auth/google/callback';
    
    console.log('Using callback URL:', callbackURL);
    
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      callbackURL
    })(req, res, next);
  }

  handleGoogleCallback(req, res, next) {
    const { frontendURL, callbackURL } = getURLs();
    
    passport.authenticate('google', {
      callbackURL,
      failureRedirect: `${frontendURL}/login?error=auth_failed`
    }, (err, user, info) => {
      if (err) {
        console.error('Authentication error:', err);
        return res.redirect(`${frontendURL}/login?error=auth_failed`);
      }
      
      if (!user) {
        console.log('No user found:', info);
        return res.redirect(`${frontendURL}/login?error=unauthorized`);
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.redirect(`${frontendURL}/login?error=auth_failed`);
        }
        
        // Add debug logging
        console.log('User logged in successfully:', user);
        console.log('Session:', req.session);
        
        return res.redirect(`${frontendURL}/welcome`);
      });
    })(req, res, next);
  }

  logout(req, res) {
    req.logout((err) => {
      if (err) {
        console.error("Error al cerrar sesión:", err);
        return res.status(500).json({ success: false, message: "Error al cerrar sesión" });
      }
  
      req.session.destroy((err) => {
        if (err) {
          console.error("Error al destruir la sesión:", err);
          return res.status(500).json({ success: false, message: "Error al cerrar sesión" });
        }
  
        res.clearCookie('connect.sid', { path: '/', httpOnly: true, secure: true, sameSite: 'none' });
  
        const { frontendURL } = getURLs();
        return res.json({ success: true, redirectUrl: `${frontendURL}/login` });
      });
    });
  }
   
  
  
}

export default new AuthController();