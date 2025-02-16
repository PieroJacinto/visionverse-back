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

  // Serialización más detallada
  passport.serializeUser((profile, done) => {
    console.log('Serializando usuario:', profile);
    try {
      const user = {
        id: profile.id,
        provider: profile.provider,
        email: profile.emails?.[0]?.value || profile._json?.email,
        displayName: profile.displayName,
        // Añadir más datos si los necesitas
        photo: profile.photos?.[0]?.value,
        name: profile.name
      };
      console.log('Usuario serializado:', user);
      done(null, user);
    } catch (error) {
      console.error('Error al serializar usuario:', error);
      done(error, null);
    }
  });

  passport.deserializeUser((user, done) => {
    console.log('Deserializando usuario:', user);
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
          // Asegurarse de que el email esté incluido
          const user = {
            ...profile,
            email: profile.emails?.[0]?.value
          };
          return done(null, user);
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
          profileFields: ['id', 'displayName', 'email', 'photos', 'name'],
          proxy: true
        },
        function(accessToken, refreshToken, profile, done) {
          console.log("Facebook authentication successful", profile);
          // Asegurarse de que el email esté incluido
          const user = {
            ...profile,
            email: profile.emails?.[0]?.value
          };
          return done(null, user);
        }
      )
    );
  }
};