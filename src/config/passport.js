// passport.js
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import passport from "passport";
import * as process from "process";

export const configurePassport = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const baseURL = isProduction
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const googleCallbackURL = `${baseURL}/api/auth/google/callback`;
  const facebookCallbackURL = `${baseURL}/api/auth/facebook/callback`;

  // Log de configuración
  console.log('Passport Configuration:', {
    environment: process.env.NODE_ENV,
    baseURL,
    googleCallbackURL,
    facebookCallbackURL,
    googleClientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not Set',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not Set',
    facebookAppId: process.env.FACEBOOK_APP_ID ? 'Set' : 'Not Set',
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET ? 'Set' : 'Not Set'
  });

  passport.serializeUser((user, done) => {
    const userData = {
      id: user.id,
      provider: user.provider,
      email: user.emails?.[0]?.value || user.email,
      displayName: user.displayName
    };
    done(null, userData);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  // Google Strategy
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Google OAuth credentials are not set');
  } else {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: googleCallbackURL,
          proxy: true,
        },
        function (accessToken, refreshToken, profile, done) {
          console.log("Google authentication successful", profile);
          return done(null, profile);
        }
      )
    );
  }
  
  // Facebook Strategy
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    console.error('Facebook OAuth credentials are not set');
  } else {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: facebookCallbackURL,
          profileFields: ['id', 'displayName', 'email'],
          proxy: true
        },
        function(accessToken, refreshToken, profile, done) {
          console.log("Facebook authentication successful", profile);
          return done(null, profile);
        }
      )
    );
  }
};