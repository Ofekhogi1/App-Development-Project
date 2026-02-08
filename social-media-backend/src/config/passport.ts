import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/user.model';
import { env } from './env';

export const initPassport = (): void => {
  console.log('Initializing passport strategies');
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.SERVER_URL}/api/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        console.log('GoogleStrategy callback invoked for profile id:', profile.id);
        try {
          const email = profile.emails?.[0]?.value;
          console.log('Google profile email:', email);
          if (!email) {
            console.error('No email found in Google profile', profile);
            return done(new Error('No email from Google profile'));
          }

          // 1. Try finding by googleId
          let user = await User.findOne({ googleId: profile.id });

          // 2. Try linking by email (existing account)
          if (!user) {
            user = await User.findOne({ email });
            if (user) {
              user.googleId = profile.id;
              if (!user.avatarUrl && profile.photos?.[0]?.value) {
                user.avatarUrl = profile.photos[0].value;
              }
              await user.save();
            }
          }

          // 3. Create new user
          if (!user) {
            const rawDisplay = (profile.displayName || email.split('@')[0] || 'user').trim();
            const baseUsername = rawDisplay
              .toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/[^a-z0-9_]/g, '')
              .substring(0, 25);

            // Ensure username is unique (fallback if base is too short, e.g. non-latin display names)
            let username = baseUsername.length >= 3 ? baseUsername : `user_${Date.now()}`;
            const exists = await User.findOne({ username });
            if (exists) {
              username = `${username}_${Date.now().toString().slice(-4)}`;
            }

            user = await User.create({
              googleId: profile.id,
              email,
              username,
              avatarUrl: profile.photos?.[0]?.value || null,
              isProfileComplete: false,
            });
          }

          console.log('Authenticated/created user for googleId:', profile.id, 'userId:', user?._id);
          return done(null, user);
        } catch (err) {
          console.error('Error in GoogleStrategy verify callback:', err);
          return done(err as Error);
        }
      }
    )
  );
};
