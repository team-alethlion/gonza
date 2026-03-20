"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, Home, CreditCard } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application Error:", error);
  }, [error]);

  const isSubscriptionError = error.message?.toLowerCase().includes("subscription") || 
                             error.message?.toLowerCase().includes("expired") ||
                             error.message?.toLowerCase().includes("unauthorized");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-red-100 max-w-lg w-full space-y-8">
        <div className="flex justify-center">
          <div className="bg-red-50 p-4 rounded-full">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold text-gray-900">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            {error.message || "An unexpected error occurred while processing your request."}
          </p>
          {error.digest && (
            <p className="text-[10px] text-gray-400 font-mono">Error ID: {error.digest}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button onClick={() => reset()} variant="outline" className="gap-2">
            <RefreshCcw className="w-4 h-4" />
            Try Again
          </Button>
          
          {isSubscriptionError ? (
            <Button asChild className="gap-2 bg-amber-600 hover:bg-amber-700">
              <Link href="/subscription">
                <CreditCard className="w-4 h-4" />
                Fix Subscription
              </Link>
            </Button>
          ) : (
            <Button asChild className="gap-2">
              <Link href="/">
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Link>
            </Button>
          )}
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            If this problem persists, please contact support at <a href="mailto:support@gonzasystems.com" className="text-primary font-semibold hover:underline">support@gonzasystems.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
