/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://127.0.0.1:8000/api";

// 🔐 REFRESH LOCK (Singleton Pattern)
// This prevents multiple simultaneous requests from triggering a "Refresh Storm"
let globalRefreshPromise: Promise<any> | null = null;

const nextAuth = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // 1. Authenticate with Django to get tokens
          const tokenRes = await fetch(`${DJANGO_API_URL}/auth/token/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!tokenRes.ok) {
            console.error("[Auth] Login failed status:", tokenRes.status);
            return null;
          }

          const tokens = await tokenRes.json();
          const accessToken = tokens.access;

          // 2. Fetch User Profile from Django (using the new /me/ endpoint)
          const userRes = await fetch(`${DJANGO_API_URL}/users/users/me/`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!userRes.ok) {
            console.error("[Auth] Profile fetch failed status:", userRes.status);
            return null;
          }

          const user = await userRes.json();

          if (!user) return null;

          const agency = user.agency || {};
          const branch = user.branch || {};

          // Ensure we extract the ID string correctly
          const agencyId = typeof agency === 'object' ? agency.id : agency;
          const branchId = typeof branch === 'object' ? branch.id : branch;

          console.log("[Auth] Authorize successful for:", user.email);

          return {
            id: user.id || user.email,
            name: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email,
            email: user.email,
            image: user.image,
            role: user.role?.name || 'User',
            branchId: branchId,
            agencyId: agencyId,
            isOnboarded: user.is_onboarded || false,
            agencyOnboarded: agency.is_onboarded || false, 
            subscriptionStatus: agency.subscription_status || "expired",
            subscriptionExpiry: agency.subscription_expiry,
            trialEndDate: agency.trial_end_date,
            status: user.status || "ACTIVE",
            accessToken: accessToken,
            refreshToken: tokens.refresh,
            accessTokenExpires: Date.now() + 24 * 60 * 60 * 1000, // 🛡️ Set initial expiry
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.branchId = (user as any).branchId;
        token.agencyId = (user as any).agencyId;
        token.isOnboarded = (user as any).isOnboarded;
        token.agencyOnboarded = (user as any).agencyOnboarded;
        token.subscriptionStatus = (user as any).subscriptionStatus;
        token.subscriptionExpiry = (user as any).subscriptionExpiry;
        token.trialEndDate = (user as any).trialEndDate;
        token.status = (user as any).status;
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
        // Set expiry time (default to 24h if not provided by backend)
        token.accessTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        console.log("[Auth] JWT Initial Token set for:", token.id);
      } 

      // Programmatic updates
      if (trigger === "update") {
        console.log("[Auth] JWT Programmatic update triggered");
        if (session?.impersonatingAgencyId) token.impersonatingAgencyId = session.impersonatingAgencyId;
        if (session?.clearImpersonation) delete token.impersonatingAgencyId;
        if (session?.branchId) token.branchId = session.branchId;
        if (session?.status) token.status = session.status;
        
        if (session?.isOnboarded !== undefined) token.isOnboarded = session.isOnboarded;
        if (session?.agencyOnboarded !== undefined) token.agencyOnboarded = session.agencyOnboarded;

        if (session?.subscriptionStatus) token.subscriptionStatus = session.subscriptionStatus;
        if (session?.subscriptionExpiry) token.subscriptionExpiry = session.subscriptionExpiry;
        if (session?.trialEndDate) token.trialEndDate = session.trialEndDate;

        // FORCE RE-FETCH FROM BACKEND
        if (session?.refreshFromDb && token.accessToken) {
          try {
            console.log("[Auth] Re-fetching profile from Django DB...");
            const res = await fetch(`${DJANGO_API_URL}/users/users/me/`, {
              headers: { Authorization: `Bearer ${token.accessToken}` },
            });
            if (res.ok) {
              const freshUser = await res.json();
              const freshAgency = freshUser.agency || {};
              
              token.subscriptionStatus = freshAgency.subscription_status || "expired";
              token.subscriptionExpiry = freshAgency.subscription_expiry;
              token.trialEndDate = freshAgency.trial_end_date;
              token.isOnboarded = freshUser.is_onboarded;
              token.status = freshUser.status;
              
              console.log("[Auth] JWT refreshed from DB. Status:", token.subscriptionStatus);
            }
          } catch (e) {
            console.error("[Auth] JWT background refresh failed:", e);
          }
        }
      }

      // 🔄 AUTOMATIC TOKEN REFRESH
      // If the token has not expired yet, return it
      const now = Date.now();
      const expires = token.accessTokenExpires as number;

      if (expires && now < expires) {
        return token;
      }

      // If the access token has expired, try to refresh it
      console.log(`[Auth] Access Token expired (Now: ${now}, Expires: ${expires}). Attempting refresh...`);

      try {
        // Use the global lock to ensure only ONE fetch happens
        if (!globalRefreshPromise) {
          console.log("[Auth] Refresh lock acquired. Calling Django...");
          globalRefreshPromise = fetch(`${DJANGO_API_URL}/auth/token/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: token.refreshToken }),
          }).then(async (res) => {
            const data = await res.json();
            if (!res.ok) {
              console.error("[Auth] Django refresh failed:", data);
              throw data;
            }
            return data;
          }).finally(() => {
            // 🛡️ SAFETY: Wait a few seconds before clearing the lock
            // This prevents concurrent requests that haven't received the new cookie yet
            // from triggering another refresh storm.
            setTimeout(() => {
              globalRefreshPromise = null;
            }, 5000); 
          });
        } else {
          console.log("[Auth] Refresh already in progress. Waiting for result...");
        }

        const refreshedTokens = await globalRefreshPromise;

        console.log("[Auth] Access Token refreshed successfully (synchronized)");
        return {
          ...token,
          accessToken: refreshedTokens.access,
          // Update expiry (assuming another 24h)
          accessTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
          // Use the new refresh token if provided, else fall back to old one
          refreshToken: refreshedTokens.refresh ?? token.refreshToken,
        };
      } catch (error) {
        console.error("[Auth] Error refreshing access token", error);
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).branchId = token.branchId as string;
        (session.user as any).agencyId = token.agencyId as string;
        (session.user as any).isOnboarded = token.isOnboarded;
        (session.user as any).agencyOnboarded = token.agencyOnboarded;
        (session.user as any).subscriptionStatus = token.subscriptionStatus;
        (session.user as any).subscriptionExpiry = token.subscriptionExpiry;
        (session.user as any).trialEndDate = token.trialEndDate;
        (session.user as any).status = token.status;
        (session as any).accessToken = token.accessToken;

        if (token.impersonatingAgencyId) {
          (session as any).impersonatingAgencyId = token.impersonatingAgencyId;
        }
      }
      return session;
    },
  },
});

export const auth = nextAuth.auth;
export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
