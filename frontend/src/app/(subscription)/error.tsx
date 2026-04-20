"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function SubscriptionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Subscription Module Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="bg-red-100 p-6 rounded-full">
            <AlertTriangle className="w-16 h-16 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Subscription Error</h1>
          <p className="text-muted-foreground">
            {error.message || "We encountered a problem loading your subscription details."}
          </p>
          {error.digest && (
            <p className="text-[10px] text-gray-400 font-mono mt-2">Error ID: {error.digest}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCcw className="w-4 h-4" /> Refresh Page
          </Button>
          <Button onClick={() => signOut({ callbackUrl: '/public/login' })} variant="outline" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}