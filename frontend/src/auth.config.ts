/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextAuthConfig } from "next-auth"

import agencyProxy from "./app/(agency)/proxy";
import publicProxy from "./app/(public)/proxy";
import subscriptionProxy from "./app/(subscription)/proxy";
import onboardingProxy from "./app/(onboarding)/proxy";
import paymentsProxy from "./app/(payments)/proxy";

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://127.0.0.1:8000/api";

// 🔐 REFRESH LOCK (Singleton Pattern)
// This prevents multiple simultaneous requests from triggering a "Refresh Storm"
let globalRefreshPromise: Promise<any> | null = null;

export const authConfig = {
  pages: {
    signIn: "/public/login",
    newUser: "/public/signup",
    error: '/auth/error',
  },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.status = (user as any).status
        token.branchId = (user as any).branchId
        token.agencyId = (user as any).agencyId
        token.isOnboarded = (user as any).isOnboarded
        token.agencyOnboarded = (user as any).agencyOnboarded
        token.subscriptionStatus = (user as any).subscriptionStatus
        token.subscriptionExpiry = (user as any).subscriptionExpiry
        token.trialEndDate = (user as any).trialEndDate
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
        // Set expiry time (default to 24h if not provided by backend)
        token.accessTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        console.log("[Auth] JWT Initial Token set for:", token.id);
      }
      
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

      // 🛡️ SILENCE REFRESH STORM: If we already know the refresh failed, don't try again
      if (token.error === "RefreshAccessTokenError") {
        const nowTime = Date.now();
        const lastSync = token.lastStatusSync as number || 0;
        const syncInterval = 60 * 1000; // 1 minute throttle
        
        if (token.agencyId && (nowTime - lastSync > syncInterval)) {
          console.log(`[Auth] Orphaned Session: Attempting silent status sync for agency: ${token.agencyId}...`);
          try {
            // Extract agency ID string regardless of format (object or string)
            const agId = typeof token.agencyId === 'object' ? (token.agencyId as any).id : token.agencyId;
            
            // 🛡️ ANONYMOUS FETCH: Bypasses the dead Bearer token
            const res = await fetch(`${DJANGO_API_URL}/core/agencies/${agId}/`, {
              headers: { "Content-Type": "application/json" }
            });
            
            if (res.ok) {
              const fresh = await res.json();
              token.subscriptionStatus = fresh.subscription_status;
              token.subscriptionExpiry = fresh.subscription_expiry;
              token.trialEndDate = fresh.trial_end_date;
              token.isOnboarded = fresh.is_onboarded;
              token.lastStatusSync = nowTime;
              console.log(`[Auth] Silent Sync Success: Status=${token.subscriptionStatus}, Onboarded=${token.isOnboarded}`);
            } else {
              console.warn(`[Auth] Silent Sync failed (HTTP ${res.status}). Will retry in ${syncInterval/1000}s.`);
              token.lastStatusSync = nowTime; // Prevent spamming even on failure
            }
          } catch (e) {
            console.error("[Auth] Silent Sync Critical Error:", e);
            token.lastStatusSync = nowTime;
          }
        }
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
        if (token.id) session.user.id = token.id as string
        if (token.role) (session.user as any).role = token.role as string
        if (token.status) (session.user as any).status = token.status as string
        if (token.branchId) (session.user as any).branchId = token.branchId as string
        if (token.agencyId) (session.user as any).agencyId = token.agencyId as string
        if (token.isOnboarded !== undefined) (session.user as any).isOnboarded = token.isOnboarded as boolean
        if (token.agencyOnboarded !== undefined) (session.user as any).agencyOnboarded = token.agencyOnboarded as boolean
        if (token.subscriptionStatus) (session.user as any).subscriptionStatus = token.subscriptionStatus as string
        if (token.subscriptionExpiry) (session.user as any).subscriptionExpiry = token.subscriptionExpiry as string
        if (token.trialEndDate) (session.user as any).trialEndDate = token.trialEndDate as string
        (session as any).accessToken = token.accessToken;
        (session as any).authError = token.error;
        
        if (token.impersonatingAgencyId) {
           (session as any).impersonatingAgencyId = token.impersonatingAgencyId;
        }
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const user = auth?.user as any
      const role = user?.role?.toLowerCase()
      const status = user?.status
      const subStatus = user?.subscriptionStatus
      const subExpiry = user?.subscriptionExpiry
      const trialEnd = user?.trialEndDate
      const isOnboardedVal = user?.isOnboarded

      const isPublicPath = ["/public", "/public/login", "/public/signup", "/privacy-policy", "/auth/error", "/verify-email"].includes(nextUrl.pathname)
      const isSubscriptionPath = nextUrl.pathname === "/subscription"
      const isOnboardingPath = nextUrl.pathname === "/onboarding"
      const isRootPath = nextUrl.pathname === "/"

      // 🕒 COMPUTE REAL-TIME VALIDITY FOR LOGS
      const now = new Date();
      const isTrialExpired = subStatus === 'trial' && trialEnd && new Date(trialEnd) < now;
      const isSubExpired = subStatus === 'active' && subExpiry && new Date(subExpiry) < now;
      const subLabel = (isTrialExpired || isSubExpired || subStatus === 'expired') 
        ? `${subStatus} (EXPIRED)` 
        : subStatus;

      console.log(`[Middleware] CHECK -> Path: ${nextUrl.pathname}, User: ${user?.email}, Role: ${role}, Status: ${status}, Onboarded: ${isOnboardedVal}, Sub: ${subLabel}`);
      // 1. Handle Public Paths and Authentication via delegating to sub-proxies
      if (isPublicPath || isRootPath) {
        return publicProxy(auth, nextUrl);
      }

      // 2. Base Authentication Check (required for all other paths)
      if (!isLoggedIn) {
        return false 
      }

      // 3. Handle Email Verification & Account Status (Global checks)
      if (status === 'PENDING_VERIFICATION' && nextUrl.pathname !== "/verify-email" && !nextUrl.pathname.startsWith('/api/auth')) {
        return Response.redirect(new URL("/verify-email", nextUrl))
      }

      // 4. Handle Account Status (Global check)
      if ((status === 'EXPIRED' || status === 'SUSPENDED') && !isSubscriptionPath && !nextUrl.pathname.startsWith('/api/auth')) {
        console.log(`[Middleware] Account ${status}. Redirecting to /subscription`);
        return Response.redirect(new URL("/subscription", nextUrl))
      }

      if (nextUrl.pathname.startsWith("/agency")) {
        return agencyProxy(auth, nextUrl);
      }

      if (nextUrl.pathname.startsWith("/onboarding")) {
        return onboardingProxy(auth, nextUrl);
      }

      if (isSubscriptionPath) {
        return subscriptionProxy(auth, nextUrl);
      }

      if (nextUrl.pathname.startsWith("/payments") || nextUrl.pathname.startsWith("/api/payments")) {
        console.log(`[Middleware] Delegating to Payments Proxy for: ${nextUrl.pathname}`);
        return paymentsProxy(auth, nextUrl);
      }

      return true;
    },
  },
  providers: [], 
} satisfies NextAuthConfig
