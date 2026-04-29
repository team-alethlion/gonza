/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import { LoginHelpDialog } from "./LoginHelpDialog";
import { LoginSocial } from "./LoginSocial";
import { ForgotPasswordButton } from "./ForgotPasswordButton";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

export function LoginForm({ isDark = false }: { isDark?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, user } = useAuth();
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if user is already authenticated
  useEffect(() => {
    const isRecovery =
      typeof window !== "undefined" &&
      window.location.hash.includes("type=recovery");

    if (user && !isRecovery) {
      console.log(
        "User already authenticated, letting middleware handle routing",
      );
    }
  }, [user, router]);

  const handleSubmit = async (data: LoginFormValues) => {
    setLoading(true);

    try {
      await signIn(data.email, data.password);
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
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={cn(isDark && "text-slate-300")}>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="Enter your email"
                    className={cn(
                      "border-input focus:border-primary",
                      isDark && "bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    )}
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
                <FormLabel className={cn(isDark && "text-slate-300")}>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className={cn(
                        "border-input focus:border-primary pr-10",
                        isDark && "bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                      )}
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
            <ForgotPasswordButton form={form as any} />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </Form>

      <div className="relative my-4">
        <Separator className={cn(isDark && "bg-white/10")} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            "px-2 text-xs uppercase tracking-widest",
            isDark ? "bg-[#0b1326] text-slate-500" : "bg-white text-gray-500"
          )}>OR</span>
        </div>
      </div>

      <LoginSocial loading={loading} />

      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full mt-4",
          isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "border-primary/20 hover:bg-primary/5"
        )}
        onClick={() => router.push("/public/signup")}
        disabled={loading}>
        Create Account
      </Button>
    </div>
  );
}
