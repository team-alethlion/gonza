"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass, ArrowLeft } from "lucide-react";

export default function OnboardingNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFD] px-6 text-center">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
        <div className="flex justify-center">
          <div className="bg-slate-50 p-5 rounded-3xl text-primary">
            <Compass className="w-12 h-12 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">404</h1>
          <h2 className="text-xl font-bold text-slate-700">Lost in Configuration?</h2>
          <p className="text-slate-500 font-medium text-sm leading-relaxed">
            The onboarding step you are looking for doesn&apos;t exist or is no longer accessible.
          </p>
        </div>

        <Button asChild className="h-14 w-full bg-primary hover:bg-primary/95 rounded-2xl font-bold shadow-lg shadow-primary/20">
          <Link href="/onboarding">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Onboarding
          </Link>
        </Button>
      </div>
    </div>
  );
}
