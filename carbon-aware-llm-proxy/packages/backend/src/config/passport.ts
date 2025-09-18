import passport from "passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { Strategy as FacebookStrategy, Profile as FacebookProfile } from "passport-facebook";
import MicrosoftStrategy from "passport-microsoft";
import { databaseService } from "../services/database.service";
import { User } from "../entities/User";
import { logger } from "../utils/logger";

// Helper to upsert user using TypeORM for now (plan to migrate to Supabase later)
async function upsertOAuthUser({
  provider,
  oauthId,
  email,
  name,
  avatarUrl,
  profile,
}: {
  provider: string;
  oauthId: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  profile: any;
}) {
  const repo = databaseService.getDataSource().getRepository(User);

  // Try by provider+oauthId first
  let user = await repo.findOne({ where: { oauthProvider: provider, oauthId } });

  // If not found and we have email, try by email to link existing accounts
  if (!user && email) {
    user = await repo.findOne({ where: { email } });
  }

  if (!user) {
    user = new User();
    user.email = email || `${provider}_${oauthId}@example.com`;
    user.passwordHash = ""; // Not used for OAuth accounts
  }

  user.name = name || user.name || null;
  user.avatarUrl = avatarUrl || user.avatarUrl || null;
  user.oauthProvider = provider;
  user.oauthId = oauthId;
  user.oauthProfile = profile;
  user.emailVerified = true;

  return await repo.save(user);
}

// GOOGLE
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.OAUTH_CALLBACK_BASE_URL?.replace(/\/$/, "") +
          "/v1/auth/oauth/google/callback",
      },
      async (_accessToken, _refreshToken, profile: GoogleProfile, done) => {
        try {
          const email = profile.emails?.[0]?.value || null;
          const name = profile.displayName || [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(" ") || null;
          const avatarUrl = (profile.photos && profile.photos[0]?.value) || null;
          const user = await upsertOAuthUser({
            provider: "google",
            oauthId: profile.id,
            email,
            name,
            avatarUrl,
            profile,
          });
          return done(null, user);
        } catch (err) {
          logger.error("Google OAuth verify error", err);
          return done(err as any);
        }
      }
    )
  );
}

// FACEBOOK
if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL:
          process.env.OAUTH_CALLBACK_BASE_URL?.replace(/\/$/, "") +
          "/v1/auth/oauth/facebook/callback",
        profileFields: ["id", "displayName", "photos", "email"],
      },
      async (_accessToken, _refreshToken, profile: FacebookProfile, done) => {
        try {
          const email = (profile as any).emails?.[0]?.value || null;
          const name = profile.displayName || null;
          const avatarUrl = (profile.photos && profile.photos[0]?.value) || null;
          const user = await upsertOAuthUser({
            provider: "facebook",
            oauthId: profile.id,
            email,
            name,
            avatarUrl,
            profile,
          });
          return done(null, user);
        } catch (err) {
          logger.error("Facebook OAuth verify error", err);
          return done(err as any);
        }
      }
    )
  );
}

// MICROSOFT (multi-tenant)
const MicrosoftOAuth2Strategy = (MicrosoftStrategy as any).Strategy || (MicrosoftStrategy as any);
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(
    new MicrosoftOAuth2Strategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL:
          process.env.OAUTH_CALLBACK_BASE_URL?.replace(/\/$/, "") +
          "/v1/auth/oauth/microsoft/callback",
        // Pass through tenant via env if needed; default to common
        tenant: process.env.MICROSOFT_TENANT_ID || "common",
        // Scope minimal profile
        scope: ["user.read"],
      },
      async (_accessToken: string, _refreshToken: string, params: any, profile: any, done: Function) => {
        try {
          const email = profile.emails?.[0]?.value || profile._json?.mail || profile._json?.userPrincipalName || null;
          const name = profile.displayName || profile._json?.displayName || null;
          const avatarUrl = null;
          const user = await upsertOAuthUser({
            provider: "microsoft",
            oauthId: profile.id,
            email,
            name,
            avatarUrl,
            profile,
          });
          return done(null, user);
        } catch (err) {
          logger.error("Microsoft OAuth verify error", err);
          return done(err as any);
        }
      }
    )
  );
}

// We do not use sessions; no serializeUser/deserializeUser necessary
