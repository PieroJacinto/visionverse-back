import passport from 'passport';
import * as process from 'process';

const getURLs = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    frontendURL: isProduction 
      ? process.env.FRONTEND_URL_PROD 
      : process.env.FRONTEND_URL_DEV,
    googleCallbackURL: isProduction 
      ? 'https://visionverse-back.vercel.app/api/auth/google/callback'
      : 'http://localhost:3000/api/auth/google/callback',
    facebookCallbackURL: isProduction 
      ? 'https://visionverse-back.vercel.app/api/auth/facebook/callback'
      : 'http://localhost:3000/api/auth/facebook/callback'
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
    const { googleCallbackURL } = getURLs();
    
    if (req.query.returnTo) {
      req.session.returnTo = req.query.returnTo;
    }
    
    console.log('Using callback URL:', googleCallbackURL);
    
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      callbackURL: googleCallbackURL
    })(req, res, next);
  }
  
  initiateFacebookAuth(req, res, next) {
    console.log('Iniciando autenticación con Facebook');
    const { facebookCallbackURL } = getURLs();
    
    if (req.query.returnTo) {
      req.session.returnTo = req.query.returnTo;
    }
    
    if (req.query.debug) {
      console.log('Debug mode activated for Facebook auth');
      console.log('Session:', req.session);
      console.log('Facebook App ID:', process.env.FACEBOOK_APP_ID);
      console.log('Facebook App Secret exists:', !!process.env.FACEBOOK_APP_SECRET);
    }
    
    console.log('Using callback URL:', facebookCallbackURL);
    
    passport.authenticate('facebook', {
      scope: ['email', 'public_profile'],
      callbackURL: facebookCallbackURL,
      profileFields: ['id', 'emails', 'name'],
      enableProof: true
    })(req, res, next);
  }

  handleGoogleCallback(req, res, next) {
    const { frontendURL, googleCallbackURL } = getURLs();
    
    passport.authenticate('google', {
      callbackURL: googleCallbackURL,
      failureRedirect: `${frontendURL}/login?error=auth_failed`
    }, (err, user, info) => {
      if (err) {
        console.error('Authentication error:', err);
        return res.redirect(`${frontendURL}/login?error=auth_failed&message=${encodeURIComponent(err.message)}`);
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
        
        console.log('User logged in successfully:', {
          id: user.id,
          provider: user.provider,
          email: user.email,
          displayName: user.displayName
        });
        
        const returnTo = req.session.returnTo || '/welcome';
        delete req.session.returnTo;
        
        return res.redirect(`${frontendURL}${returnTo}`);
      });
    })(req, res, next);
  }
  
  handleFacebookCallback(req, res, next) {
    const { frontendURL, facebookCallbackURL } = getURLs();
    
    passport.authenticate('facebook', {
      callbackURL: facebookCallbackURL,
      failureRedirect: `${frontendURL}/login?error=auth_failed`
    }, (err, user, info) => {
      if (err) {
        console.error('Error de autenticación de Facebook:', err);
        return res.redirect(`${frontendURL}/login?error=auth_failed&message=${encodeURIComponent(err.message)}`);
      }
      
      if (!user) {
        console.log('No se encontró usuario:', info);
        return res.redirect(`${frontendURL}/login?error=unauthorized`);
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error('Error en login:', err);
          return res.redirect(`${frontendURL}/login?error=auth_failed`);
        }
        
        console.log('Usuario autenticado exitosamente:', {
          id: user.id,
          provider: user.provider,
          email: user.email,
          displayName: user.displayName
        });
        
        const returnTo = req.session.returnTo || '/welcome';
        delete req.session.returnTo;
        
        return res.redirect(`${frontendURL}${returnTo}`);
      });
    })(req, res, next);
  }

  logout(req, res) {
    // Nueva implementación del logout para cookie-session
    try {
      // Limpiar la sesión
      req.session = null;
      
      // Limpiar la autenticación de Passport
      req.logout(() => {
        const { frontendURL } = getURLs();
        res.json({ 
          success: true, 
          redirectUrl: `${frontendURL}/login` 
        });
      });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al cerrar sesión" 
      });
    }
  }
}

export default new AuthController();