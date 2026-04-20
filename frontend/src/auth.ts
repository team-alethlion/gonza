/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://127.0.0.1:8000/api";

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
});

export const auth = nextAuth.auth;
export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
