"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import { LoginHelpDialog } from "./LoginHelpDialog";
import { LoginSocial } from "./LoginSocial";
import { ForgotPasswordButton } from "./ForgotPasswordButton";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, user } = useAuth();
  const router = useRouter();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if user is already authenticated
  useEffect(() => {
    // Don't redirect if this is a password recovery flow
    const isRecovery = typeof window !== "undefined" && window.location.hash.includes("type=recovery");

    if (user && !isRecovery) {
      console.log("User already authenticated, letting middleware handle routing");
      // Removing hardcoded /agency redirect to allow strict middleware to work
    }
  }, [user, router]);

  const handleSubmit = async (data: LoginFormData) => {
    setLoading(true);

    try {
      await signIn(data.email, data.password);
      // redirect handled by signIn callback
    } catch (error: any) {
      console.error("Email/password sign in error:", error);
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.error(`Login failed: ${error?.message || "Unknown error"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="Enter your email"
                    className="border-input focus:border-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="border-input focus:border-primary pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between">
            <LoginHelpDialog />
            <ForgotPasswordButton form={form} />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </Form>

      <div className="relative my-4">
        <Separator />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="bg-white px-2 text-sm text-gray-500">OR</span>
        </div>
      </div>

      <LoginSocial loading={loading} />

      <Button
        type="button"
        variant="outline"
        className="w-full border-primary/20 hover:bg-primary/5 mt-4"
        onClick={() => router.push("/public/signup")}
        disabled={loading}>
        Create Account
      </Button>
    </div>
  );
}
