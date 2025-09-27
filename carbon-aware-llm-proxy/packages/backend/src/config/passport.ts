import passport from "passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { Strategy as FacebookStrategy, Profile as FacebookProfile } from "passport-facebook";
import MicrosoftStrategy from "passport-microsoft";
import { supabaseConfig } from "../config/supabase";
import { logger } from "../utils/logger";

type OAuthProfile = Record<string, any> | null;

// Helper to upsert user using Supabase service role client
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
  profile: OAuthProfile;
}) {
  const client = supabaseConfig.getServiceRoleClient();
  const fallbackEmail = email || `${provider}_${oauthId}@example.com`;
  const timestamp = new Date().toISOString();

  const baseUpdates = {
    email: fallbackEmail,
    name: name || fallbackEmail.split("@")[0],
    avatar_url: avatarUrl ?? null,
    oauth_provider: provider,
    oauth_id: oauthId,
    oauth_profile: profile ?? null,
    email_verified: true,
    role: "user",
    updated_at: timestamp,
  } as Record<string, any>;

  try {
    // Prefer existing user by OAuth identifiers
    const { data: existingByOauth, error: byOauthError } = await client
      .from("users")
      .select("*")
      .eq("oauth_provider", provider)
      .eq("oauth_id", oauthId)
      .maybeSingle();

    if (byOauthError && byOauthError.code !== "PGRST116") {
      throw byOauthError;
    }

    if (existingByOauth) {
      const { data, error } = await client
        .from("users")
        .update(baseUpdates)
        .eq("id", existingByOauth.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    // Next try existing by email to support account linking
    const { data: existingByEmail, error: byEmailError } = await client
      .from("users")
      .select("*")
      .eq("email", fallbackEmail)
      .maybeSingle();

    if (byEmailError && byEmailError.code !== "PGRST116") {
      throw byEmailError;
    }

    if (existingByEmail) {
      const { data, error } = await client
        .from("users")
        .update(baseUpdates)
        .eq("id", existingByEmail.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const insertPayload = {
      ...baseUpdates,
      created_at: timestamp,
    };

    const { data, error } = await client
      .from("users")
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    logger.error("Failed to upsert OAuth user in Supabase", err);
    throw err;
  }
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
