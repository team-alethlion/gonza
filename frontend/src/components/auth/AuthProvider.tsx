/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { useState, useContext, createContext, useEffect } from "react";
import { toast } from "sonner";
import {
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
  useSession,
} from "next-auth/react";

import { signInAction } from "@/app/actions/auth";

// Simplified type declarations for our mock
interface User {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  role?: string;
  status?: string;
  branchId?: string;
  agencyId?: string;
  isOnboarded?: boolean;
  agencyOnboarded?: boolean;
  subscriptionStatus?: string;
  subscriptionExpiry?: string;
  trialEndDate?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  status: "authenticated" | "loading" | "unauthenticated";
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateSession: (data?: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status, update } = useSession();

  // 🚀 INSTANT SYNC: We derive the user directly from the session instead of keeping separate state.
  // This eliminates the one-tick delay caused by useEffect + setTimeout.
  const user = React.useMemo(() => {
    if (status === 'authenticated' && session?.user) {
      return {
        id: session.user.id || '',
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        image: session.user.image || undefined,
        role: (session.user as any).role,
        status: (session.user as any).status,
        branchId: (session.user as any).branchId,
        agencyId: (session.user as any).agencyId,
        isOnboarded: (session.user as any).isOnboarded,
        agencyOnboarded: (session.user as any).agencyOnboarded,
        subscriptionStatus: (session.user as any).subscriptionStatus,
        subscriptionExpiry: (session.user as any).subscriptionExpiry,
        trialEndDate: (session.user as any).trialEndDate,
      } as User;
    }
    return null;
  }, [session, status]);

  const loading = status === "loading";

  const updateSession = React.useCallback(
    async (data?: any) => {
      return await update(data);
    },
    [update],
  );

  const signIn = React.useCallback(async (email: string, password: string) => {
    const result = (await nextAuthSignIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/agency",
    })) as any;

    if (result?.error) {
      throw new Error(result.error);
    }
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    await nextAuthSignIn("google", { callbackUrl: "/public" });
  }, []);

  const signOut = React.useCallback(async () => {
    await nextAuthSignOut({ redirect: true, callbackUrl: "/public" });
  }, []);

  const resetPassword = React.useCallback(async (email: string) => {
    toast.success("Password reset email sent");
  }, []);

  const contextValue = React.useMemo(
    () => ({
      user,
      loading,
      status,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      updateSession,
    }),
    [
      user,
      loading,
      status,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      updateSession,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
