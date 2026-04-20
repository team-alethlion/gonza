/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { resetPasswordAction, signOutAction } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/auth/AuthProvider";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFormData = z.infer<typeof resetSchema>;

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const form = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const { user } = useAuth(); // Get current user from auth context

  // Extract hash from URL on component mount
  useEffect(() => {
    const hashFromUrl = window.location.hash.substring(1);

    // If we have a user session (logged in via recovery link), we can proceed
    if (user) {
      // Clean up the URL - remove the hash/token so it looks nice
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      return;
    }

    if (hashFromUrl) {
      try {
        const params = new URLSearchParams(hashFromUrl);
        const accessToken = params.get("access_token");
        const type = params.get("type");

        if (accessToken && type === "recovery") {
          setHash(accessToken);
        } else {
          setError("Invalid or missing recovery token");
        }
      } catch (e) {
        setError("Invalid URL format");
      }
    } else {
      setError("No reset token found in URL");
    }
  }, [user]);

  const onSubmit = async (data: ResetFormData) => {
    if (!hash && !user) {
      setError("Reset token is missing");
      return;
    }

    setLoading(true);
    try {
      const result = (await resetPasswordAction(
        data.password,
        hash || undefined,
      )) as any;

      if (!result.success) throw new Error(result.error);

      setResetSuccess(true);
      toast.success("Password has been reset successfully");

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error(
        `Failed to reset password: ${error?.message || "Unknown error"}`,
      );
      setError(error?.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (resetSuccess) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen p-4 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/lovable-uploads/2fca69a3-fd1f-4833-bb84-fd7f5764059f.png')`,
        }}>
        <Card className="w-full max-w-md border-primary/10 shadow-lg bg-white/90">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-primary">
              Password Reset Successful
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Your password has been reset successfully. You will be
                redirected to the login page shortly.
              </AlertDescription>
            </Alert>
            <Button onClick={() => router.push("/login")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('/lovable-uploads/2fca69a3-fd1f-4833-bb84-fd7f5764059f.png')`,
      }}>
      <div className="mb-6">
        <Image
          src="/lovable-uploads/da3f3948-8e6b-4501-b4aa-5e365d8e799e.png"
          alt="Gonzo Sales & Profit Tracker"
          // 1. Set these to the "base" (mobile) size to prevent layout jump
          width={204}
          height={64}
          // 2. Use classes to handle the responsive scaling
          className="h-16 w-auto md:h-20 object-contain transition-all duration-300"
          priority
          // 3. For logos, a slightly higher quality keeps the text crisp
          quality={90}
        />
      </div>
      <Card className="w-full max-w-md border-primary/10 shadow-lg bg-white/90">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-primary">
            Reset Your Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!error && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            className="border-input focus:border-primary pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                            {showPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            className="border-input focus:border-primary pr-10"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                            {showConfirmPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </Form>
          )}

          <div className="text-center pt-2">
            <Button
              variant="link"
              className="text-primary"
              onClick={async () => {
                await signOutAction();
                router.push("/login");
              }}>
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
