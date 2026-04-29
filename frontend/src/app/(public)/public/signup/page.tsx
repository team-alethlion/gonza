/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
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
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Timer,
  RefreshCw,
  Rocket,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  initiateSignupAction,
  verifyAndCreateAccountAction,
} from "@/app/actions/verification";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { signUpSchema, type SignUpFormValues } from "@/lib/validations/auth";
import { LoginLogo } from "../../components/login/LoginLogo";

const SignUp = () => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Verification State
  const [showVerification, setShowVerification] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [formData, setFormData] = useState<SignUpFormValues | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  const { updateSession } = useAuth();
  const router = useRouter();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Countdown timer for OTP
  useEffect(() => {
    if (!showVerification || timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [showVerification, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleInitiateSignup = async (data: SignUpFormValues) => {
    setLoading(true);
    setSignupError(null);
    try {
      const result = await initiateSignupAction(data.email);
      if (result.success) {
        setFormData(data);
        setShowVerification(true);
        setTimeLeft(600);
        toast.success("Verification code sent to your email!");
      } else {
        setSignupError(result.error || "Failed to start signup process");
        toast.error(result.error || "Failed to send code");
      }
    } catch (error: any) {
      console.error("Initiate signup error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndCreate = async () => {
    if (!formData || otpCode.length !== 6) return;
    setVerifying(true);
    try {
      const result = await verifyAndCreateAccountAction({
        ...formData,
        code: otpCode,
      });
      if (result.success && result.user) {
        toast.success("Account verified and created!");
        const signInResult = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
        if (signInResult?.error) {
          router.push("/public/login");
          return;
        }
        if (result.user.agency) {
          await updateSession({
            agencyId: result.user.agency.id,
            subscriptionStatus: result.user.agency.subscriptionStatus,
          });
        }
        router.push("/subscription");
      } else {
        toast.error(result.error || "Invalid verification code");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error("Failed to verify account");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!formData) return;
    setLoading(true);
    await handleInitiateSignup(formData);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/agency" });
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast.error("Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="bg-[#0b1326] text-[#dae2fd] min-h-screen flex antialiased">
      {/* Left Side: Functional UI Canvas */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 lg:px-20 py-12 relative z-10 bg-[#0b1326]">
        <div className="w-full max-w-[420px] flex flex-col gap-8">
          {/* Header Section */}
          <div className="flex flex-col gap-2 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <LoginLogo />
            </div>
            <h1 className="text-[32px] font-bold text-white mb-2">Create Account</h1>
            <p className="text-[15px] text-[#908fa0]">
              Join Gonza Systems today and transform your business management.
            </p>
          </div>

          {signupError && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-200">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{signupError}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleInitiateSignup)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter your full name" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Email Address</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="name@company.com" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary" />
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
                    <FormLabel className="text-slate-300">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 pr-10 focus:border-primary"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-500"
                          onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
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
                    <FormLabel className="text-slate-300">Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 h-11 text-white font-semibold shadow-lg shadow-primary/20"
                disabled={loading || !form.formState.isValid}>
                {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? "Processing..." : "Sign Up"}
              </Button>
            </form>
          </Form>

          <div className="relative my-4">
            <Separator className="bg-white/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-[#0b1326] px-2 text-xs text-slate-500 uppercase tracking-widest">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2 h-11 border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors font-medium"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            {googleLoading ? "Connecting..." : "Google Account"}
          </Button>

          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{" "}
            <Button variant="link" className="p-0 h-auto font-semibold text-primary" onClick={() => router.push("/public/login")}>
              Sign In
            </Button>
          </p>
        </div>
      </div>

      {/* Right Side: Immersive Imagery Canvas (Hidden on Mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[radial-gradient(circle_at_70%_30%,#2f3aa3_0%,#0b1326_100%)] border-l border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0b1326] to-transparent z-10 opacity-40 mix-blend-multiply"></div>
        <Image 
          src="/banners/b3.png" 
          alt="Gonza Systems Growth" 
          fill
          priority
          className="object-cover opacity-40 mix-blend-overlay z-0"
        />

        <div className="absolute bottom-[48px] left-[48px] right-[48px] z-20">
          <div className="bg-white/5 backdrop-blur-[20px] border border-white/10 rounded-[16px] p-6 max-w-[360px]">
            <div className="inline-flex items-center justify-center bg-primary/20 rounded-[6px] px-2 py-1 mb-3">
              <Rocket className="w-4 h-4 text-primary mr-2" />
              <span className="text-[11px] font-semibold text-primary uppercase tracking-[0.5px]">Scale Your Business</span>
            </div>
            <p className="text-[14px] text-[#c7c4d7] leading-[1.5]">
              Join thousands of businesses already growing with Gonza. Automated inventory, real-time sales, and deep analytics.
            </p>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      <Dialog open={showVerification} onOpenChange={(open) => !verifying && !loading && setShowVerification(open)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary p-8 text-white text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white">Verify Your Email</DialogTitle>
            <DialogDescription className="text-primary-foreground/80">
              We&apos;ve sent a 6-digit code to <span className="font-bold text-white">{formData?.email}</span>
            </DialogDescription>
            <p className="text-[10px] text-amber-200 font-medium animate-pulse pt-1">
              ⚠️ Do not refresh or close this window, or you will need to restart.
            </p>
          </div>

          <div className="p-8 space-y-6 bg-white">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} disabled={verifying}>
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className="w-12 h-12 text-lg border-gray-300" />
                  <InputOTPSlot index={1} className="w-12 h-12 text-lg border-gray-300" />
                  <InputOTPSlot index={2} className="w-12 h-12 text-lg border-gray-300" />
                  <InputOTPSlot index={3} className="w-12 h-12 text-lg border-gray-300" />
                  <InputOTPSlot index={4} className="w-12 h-12 text-lg border-gray-300" />
                  <InputOTPSlot index={5} className="w-12 h-12 text-lg border-gray-300" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="space-y-4">
              <Button onClick={handleVerifyAndCreate} className="w-full bg-primary h-12 font-bold" disabled={otpCode.length !== 6 || verifying}>
                {verifying ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                {verifying ? "Verifying..." : "Verify & Complete Signup"}
              </Button>

              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  Code expires in: <span className="font-mono font-bold text-primary">{formatTime(timeLeft)}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleResendCode} disabled={loading || timeLeft > 540} className="text-xs">
                  Didn&apos;t receive the code? Resend
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SignUp;
