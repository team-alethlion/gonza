"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, Home, LogOut, ShieldCheck, FileQuestion } from "lucide-react";
import { signOut } from "next-auth/react";
import Logo from "@/components/header/Logo";

export default function AgencyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Agency Module Error:", error);
  }, [error]);

  const isReauthRequired = error.message === "REAUTHENTICATION_REQUIRED";
  const isAccessRestricted = error.message?.includes("401") || error.message?.includes("Unauthorized");

  // 🛡️ REAUTHENTICATION UI (Subscription Recovery Path)
  if (isReauthRequired) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Logo />
            <Button
              onClick={() => signOut({ callbackUrl: "/public/login" })}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center bg-[#fafafa]">
          <div className="max-w-3xl w-full px-6 py-12 md:py-24 text-center">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-green-100 rounded-full blur-2xl opacity-50 animate-pulse"></div>
              <div className="relative w-24 h-24 bg-green-50 rounded-3xl flex items-center justify-center mx-auto border border-green-100 shadow-inner">
                <ShieldCheck className="w-12 h-12 text-green-600" />
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-4">
              Subscription Updated
            </h1>
            
            <p className="text-xl text-gray-500 max-w-xl mx-auto mb-12 leading-relaxed">
              Your account status has been successfully synchronized. To access your new features and dashboard, a secure session refresh is required.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-16 text-left">
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-shadow">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <RefreshCcw className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Sync Credentials</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Updating your session will generate fresh security tokens and unlock your dashboard access.
                </p>
                <Button 
                  onClick={() => signOut({ callbackUrl: "/public/login" })}
                  className="w-full rounded-xl bg-primary hover:bg-primary/90"
                >
                  Sign In to Sync
                </Button>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm opacity-60">
                <h3 className="font-bold text-gray-900 mb-2">Notice</h3>
                <p className="text-sm text-gray-500">
                  This is a standard security protocol following an account status change to protect your data.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 🛡️ DEFAULT ERROR / ACCESS RESTRICTED UI
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className={`p-6 rounded-full ${isAccessRestricted ? 'bg-amber-100' : 'bg-red-100'}`}>
            {isAccessRestricted ? (
              <FileQuestion className="w-16 h-16 text-amber-600" />
            ) : (
              <AlertTriangle className="w-16 h-16 text-red-500" />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
            {isAccessRestricted ? 'Access Restricted' : 'Application Error'}
          </h1>
          <p className="text-muted-foreground">
            {isAccessRestricted 
              ? "We encountered issues verifying your account profile details. Please sign out and sign in again."
              : (error.message || "An unexpected issue occurred while loading this section.")
            }
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          {!isAccessRestricted && (
            <Button onClick={() => reset()} className="gap-2">
              <RefreshCcw className="w-4 h-4" /> Try Again
            </Button>
          )}
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <Home className="w-4 h-4" /> Go Home
            </Link>
          </Button>
          <Button onClick={() => signOut({ callbackUrl: '/public/login' })} variant="destructive" className="gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}