"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { signOut } = useAuth();

  useEffect(() => {
    console.error("Onboarding Error:", error);
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
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Setup Interrupted</h1>
          <p className="text-muted-foreground">
            We encountered a technical issue while configuring your environment. 
            Don&apos;t worry, your progress up to the last completed step is safe.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCcw className="w-4 h-4" /> Resume Setup
          </Button>
          <Button variant="outline" onClick={() => signOut()} className="gap-2">
            <LogOut className="w-4 h-4" /> Sign Out & Restart
          </Button>
        </div>

        {error.digest && (
          <div className="pt-8">
            <p className="text-[10px] text-gray-400 font-mono mt-2 uppercase tracking-widest">Trace ID: {error.digest}</p>
          </div>
        )}
      </div>
    </div>
  );
}