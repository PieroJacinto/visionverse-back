import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";
import * as process from "process";

export const configurePassport = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const callbackURL = isProduction
    ? "https://visionverse-back.vercel.app/api/auth/google/callback"
    : "http://localhost:3000/api/auth/google/callback";

  passport.serializeUser((user, done) => {
    done(null, {
      id: user.id,
      email: user.emails[0].value,
      displayName: user.displayName,
    });
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: callbackURL,
        proxy: true,
      },
      function (accessToken, refreshToken, profile, done) {
        console.log(
          "Google Strategy executing with callback URL:",
          callbackURL
        );
        console.log("Email received:", profile.emails[0].value);

        return done(null, profile); // Permite cualquier email
      }
    )
  );
};
