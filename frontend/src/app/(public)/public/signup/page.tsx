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
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator } from "@/components/ui/separator";
import {
  HelpCircle,
  Mail,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  Timer,
  RefreshCw,
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

const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

const SignUp = () => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Verification State
  const [showVerification, setShowVerification] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [formData, setFormData] = useState<SignUpFormData | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  const { updateSession } = useAuth();
  const router = useRouter();

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
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

  // Step 1: Initiate Signup (Send OTP)
  const handleInitiateSignup = async (data: SignUpFormData) => {
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

  // Step 2: Verify OTP and Create Account
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

        // Sign in automatically
        const signInResult = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (signInResult?.error) {
          router.push("/public/login");
          return;
        }

        // Update session with agency info
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
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50"
      style={{
        backgroundImage: `radial-gradient(at 0% 0%, rgba(37, 40, 97, 0.05) 0, transparent 50%), radial-gradient(at 50% 0%, rgba(240, 90, 43, 0.05) 0, transparent 50%)`,
      }}>
      <div className="mb-8">
        <img
          src="/lovable-uploads/798d07d7-1db7-498c-92f3-6f6346827d59.png"
          alt="Gonzo Systems"
          className="h-12 md:h-16 object-contain"
        />
      </div>

      <Card className="w-full max-w-md border-primary/10 shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-primary">
            Create Account
          </CardTitle>
          <CardDescription className="text-center">
            Join Gonza Systems today
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signupError && (
            <Alert
              variant="destructive"
              className="mb-6 animate-in fade-in slide-in-from-top-1">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{signupError}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleInitiateSignup)}
              className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter your full name" />
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
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="name@company.com"
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
                          placeholder="••••••••"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400"
                          onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
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
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 h-11 text-white font-semibold shadow-lg shadow-primary/20"
                disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  "Sign Up"
                )}
              </Button>
            </form>
          </Form>

          <div className="relative my-6">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-white px-2 text-xs text-muted-foreground uppercase tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2 h-11 border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}>
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            {googleLoading ? "Connecting..." : "Google Account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto font-semibold text-primary"
              onClick={() => router.push("/public/login")}>
              Sign In
            </Button>
          </p>
        </CardContent>
      </Card>

      {/* Verification Modal */}
      <Dialog
        open={showVerification}
        onOpenChange={(open) =>
          !verifying && !loading && setShowVerification(open)
        }>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary p-8 text-white text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white">
              Verify Your Email
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80">
              We&apos;ve sent a 6-digit code to{" "}
              <span className="font-bold text-white">{formData?.email}</span>
            </DialogDescription>
            <p className="text-[10px] text-amber-200 font-medium animate-pulse pt-1">
              ⚠️ Do not refresh or close this window, or you will need to
              restart.
            </p>
          </div>

          <div className="p-8 space-y-6 bg-white">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                disabled={verifying}>
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot
                    index={0}
                    className="w-12 h-12 text-lg border-gray-300"
                  />
                  <InputOTPSlot
                    index={1}
                    className="w-12 h-12 text-lg border-gray-300"
                  />
                  <InputOTPSlot
                    index={2}
                    className="w-12 h-12 text-lg border-gray-300"
                  />
                  <InputOTPSlot
                    index={3}
                    className="w-12 h-12 text-lg border-gray-300"
                  />
                  <InputOTPSlot
                    index={4}
                    className="w-12 h-12 text-lg border-gray-300"
                  />
                  <InputOTPSlot
                    index={5}
                    className="w-12 h-12 text-lg border-gray-300"
                  />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleVerifyAndCreate}
                className="w-full bg-primary h-12 font-bold"
                disabled={otpCode.length !== 6 || verifying}>
                {verifying ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Verify & Complete Signup"
                )}
              </Button>

              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  Code expires in:{" "}
                  <span className="font-mono font-bold text-primary">
                    {formatTime(timeLeft)}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={loading || timeLeft > 540} // Allow resend after 1 minute
                  className="text-xs">
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
