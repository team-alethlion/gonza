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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFD] px-6 text-center">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
        <div className="flex justify-center">
          <div className="bg-red-50 p-5 rounded-3xl">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Setup Interrupted</h1>
          <p className="text-slate-500 font-medium text-sm leading-relaxed">
            We encountered a technical issue while configuring your environment. 
            Don&apos;t worry, your progress up to the last completed step is safe.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button onClick={() => reset()} className="h-14 bg-primary hover:bg-primary/95 rounded-2xl font-bold shadow-lg shadow-primary/20">
            <RefreshCcw className="w-4 h-4 mr-2" /> Resume Setup
          </Button>
          <Button variant="ghost" onClick={() => signOut()} className="h-14 text-slate-400 hover:text-red-600 font-bold">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out & Restart
          </Button>
        </div>

        {error.digest && (
          <p className="text-[10px] text-slate-300 font-mono uppercase tracking-widest">Trace ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
