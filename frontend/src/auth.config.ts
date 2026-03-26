/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextAuthConfig } from "next-auth"

import agencyProxy from "./app/(agency)/proxy";
import publicProxy from "./app/(public)/proxy";
import subscriptionProxy from "./app/(subscription)/proxy";
import onboardingProxy from "./app/(onboarding)/proxy";
import paymentsProxy from "./app/(payments)/proxy";

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
      }
      
      if (trigger === "update") {
        if (session?.branchId) token.branchId = session.branchId;
        if (session?.status) token.status = session.status;
        if (session?.isOnboarded !== undefined) token.isOnboarded = session.isOnboarded;
        if (session?.agencyOnboarded !== undefined) token.agencyOnboarded = session.agencyOnboarded;
        if (session?.subscriptionStatus) token.subscriptionStatus = session.subscriptionStatus;
        if (session?.subscriptionExpiry) token.subscriptionExpiry = session.subscriptionExpiry;
        if (session?.trialEndDate) token.trialEndDate = session.trialEndDate;
      }

      return token
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

      console.log(`[Middleware] CHECK -> Path: ${nextUrl.pathname}, User: ${user?.email}, Role: ${role}, Status: ${status}, Onboarded: ${isOnboardedVal}, Sub: ${subStatus}`);
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
