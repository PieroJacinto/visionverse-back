import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as AppleStrategy } from 'passport-apple';
import passport from "passport";
import jwt from 'jsonwebtoken';
import * as process from "process";

export const configurePassport = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const baseURL = isProduction
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const googleCallbackURL = `${baseURL}/api/auth/google/callback`;
  const facebookCallbackURL = `${baseURL}/api/auth/facebook/callback`;
  const appleCallbackURL = `${baseURL}/api/auth/apple/callback`;

  // Serialización más detallada
  passport.serializeUser((profile, done) => {
    console.log('Serializando usuario:', profile);
    try {
      const user = {
        id: profile.id,
        provider: profile.provider,
        email: profile.emails?.[0]?.value || profile._json?.email,
        displayName: profile.displayName,
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

  // Google Strategy (sin cambios)
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
          const user = {
            ...profile,
            email: profile.emails?.[0]?.value
          };
          return done(null, user);
        }
      )
    );
  }
  
  // Facebook Strategy (sin cambios)
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
          const user = {
            ...profile,
            email: profile.emails?.[0]?.value
          };
          return done(null, user);
        }
      )
    );
  }

  // Apple Strategy (actualizada con manejo de JWT)
  if (!process.env.APPLE_CLIENT_ID || !process.env.APPLE_TEAM_ID || !process.env.APPLE_KEY_ID || !process.env.APPLE_PRIVATE_KEY) {
    console.error('Apple Sign In credentials are not set');
  } else {
    passport.use(
      new AppleStrategy(
        {
          clientID: process.env.APPLE_CLIENT_ID,
          teamID: process.env.APPLE_TEAM_ID,
          keyID: process.env.APPLE_KEY_ID,
          privateKeyString: process.env.APPLE_PRIVATE_KEY,
          callbackURL: appleCallbackURL,
          passReqToCallback: true,
          scope: ['name', 'email']
        },
        async function(req, accessToken, refreshToken, idToken, profile, done) {
          try {
            console.log("Apple authentication started", { idToken });
            
            // Decodificar el token JWT
            const decodedToken = jwt.decode(idToken);
            console.log("Decoded Apple token:", decodedToken);
            
            // Extraer información del token
            const email = decodedToken.email;
            const sub = decodedToken.sub; // Apple's unique identifier
            
            // Obtener el nombre del usuario (solo disponible en el primer login)
            let firstName = '';
            let lastName = '';
            
            if (req.body && req.body.user) {
              try {
                const userData = JSON.parse(req.body.user);
                firstName = userData.name?.firstName || '';
                lastName = userData.name?.lastName || '';
              } catch (e) {
                console.error('Error parsing user data:', e);
              }
            }
            
            const user = {
              id: sub,
              provider: 'apple',
              email: email,
              displayName: firstName && lastName ? `${firstName} ${lastName}` : email.split('@')[0],
              name: {
                givenName: firstName || email.split('@')[0],
                familyName: lastName || ''
              }
            };
            
            console.log("Processed Apple user:", user);
            return done(null, user);
            
          } catch (error) {
            console.error("Error in Apple authentication:", error);
            return done(error, null);
          }
        }
      )
    );
  }
};