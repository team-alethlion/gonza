/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import Image from "next/image";

export function LoginSocial({ loading: parentLoading }: { loading: boolean }) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    toast.loading("Redirecting to Google...");

    try {
      await signInWithGoogle();
      // Don't set loading to false here - the page will redirect
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast.dismiss();
      toast.error(
        `Google sign-in failed: ${error?.message || "Unknown error"}`,
      );
      setGoogleLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full flex items-center justify-center gap-2 border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors font-medium h-11"
      onClick={handleGoogleSignIn}
      disabled={googleLoading || parentLoading}>
      <Image
        height={20}
        width={20}
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google"
        className="w-5 h-5"
      />
      {googleLoading ? "Connecting with Google..." : "Sign in with Google"}
    </Button>
  );
}
