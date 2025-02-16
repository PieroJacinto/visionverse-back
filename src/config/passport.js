import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import passport from "passport";
import * as process from "process";

export const configurePassport = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const googleCallbackURL = isProduction
    ? "https://visionverse-back.vercel.app/api/auth/google/callback"
    : "http://localhost:3000/api/auth/google/callback";
  
  const facebookCallbackURL = isProduction
    ? "https://visionverse-back.vercel.app/api/auth/facebook/callback"
    : "http://localhost:3000/api/auth/facebook/callback";

  passport.serializeUser((user, done) => {
    // Manejar tanto usuarios de Google como de Facebook
    const userData = {
      id: user.id,
      provider: user.provider
    };
    
    // Para Google
    if (user.emails && user.emails.length > 0) {
      userData.email = user.emails[0].value;
    }
    
    // Para Facebook
    if (user.email) {
      userData.email = user.email;
    }
    
    if (user.displayName) {
      userData.displayName = user.displayName;
    }
    
    done(null, userData);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  // Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: googleCallbackURL,
        proxy: true,
      },
      function (accessToken, refreshToken, profile, done) {
        console.log("Google authentication successful");
        return done(null, profile);
      }
    )
  );
  
  // Facebook Strategy
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
        console.log("Facebook authentication successful");
        return done(null, profile);
      }
    )
  );
};