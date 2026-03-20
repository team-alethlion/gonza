/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import { UseFormReturn } from "react-hook-form";

interface ForgotPasswordButtonProps {
  form: UseFormReturn<any>;
}

export function ForgotPasswordButton({ form }: ForgotPasswordButtonProps) {
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetEmailLoading, setResetEmailLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleResetPassword = async () => {
    const email = form.getValues("email");

    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }

    setResetEmailLoading(true);
    try {
      await resetPassword(email);
      setResetEmailSent(true);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(
        `Failed to send reset email: ${error?.message || "Unknown error"}`,
      );
    } finally {
      setResetEmailLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="link"
      className="text-sm text-primary p-0 h-auto"
      onClick={handleResetPassword}
      disabled={resetEmailLoading}>
      {resetEmailLoading
        ? "Sending..."
        : resetEmailSent
        ? "Email sent!"
        : "Forgot password?"}
    </Button>
  );
}
