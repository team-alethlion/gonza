"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

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
      className="w-full flex items-center justify-center gap-2 border-gray-300 hover:bg-gray-50"
      onClick={handleGoogleSignIn}
      disabled={googleLoading || parentLoading}>
      <img
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google"
        className="w-5 h-5"
      />
      {googleLoading
        ? "Connecting with Google..."
        : "Sign in with Google"}
    </Button>
  );
}
