/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Mail,
  Loader2,
  CheckCircle2,
  User,
  Lock,
  KeyRound,
  RefreshCcw,
} from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { verifyInvitationAction } from "@/app/actions/auth";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  branchName: string;
}

export const InviteManagerDialog: React.FC<InviteManagerDialogProps> = ({
  open,
  onOpenChange,
  branchId,
  branchName,
}) => {
  const [step, setStep] = useState<"invite" | "verify">("invite");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const { inviteManager } = useBusiness();
  const { toast } = useToast();

  // Handle countdown timer for resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await inviteManager(email.trim(), branchId);

      if (result.success) {
        setStep("verify");
        setResendTimer(60); // 60 seconds cooldown
        toast({
          title: "Code Sent",
          description: `A verification code has been sent to ${email}.`,
        });
      } else {
        toast({
          title: "Invitation Failed",
          description: result.error || "Could not send invitation.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !password || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // 🚀 INTEGRATION: Using the server action to verify invitation
      const result = await verifyInvitationAction({
        email: email.trim(),
        code: code.trim(),
        password: password.trim(),
        name: name.trim(),
      });

      if (result.success) {
        setIsSuccess(true);
        toast({
          title: "Manager Assigned",
          description: `${name} is now the manager of ${branchName}.`,
        });
        setTimeout(() => handleClose(), 2000);
      } else {
        toast({
          title: "Verification Failed",
          description: result.error || "Invalid code or details.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to finalize assignment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await inviteManager(email.trim(), branchId);
      setResendTimer(60);
      toast({
        title: "Code Resent",
        description: "A new code has been sent to your email.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setCode("");
    setName("");
    setPassword("");
    setStep("invite");
    setIsSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            {step === "invite"
              ? "Invite Branch Manager"
              : "Verify & Setup Manager"}
          </DialogTitle>
          <DialogDescription>
            {step === "invite"
              ? `Send an invitation to manage ${branchName}.`
              : `Enter the code sent to ${email} to complete the setup.`}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 animate-in zoom-in duration-300" />
            <p className="text-sm font-medium text-center">
              Manager assigned successfully to
              <br />
              <span className="text-blue-600 font-bold">{branchName}</span>
            </p>
          </div>
        ) : step === "invite" ? (
          <form onSubmit={handleSendInvite} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="manager-email">
                Manager&apos;s Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="manager-email"
                  type="email"
                  placeholder="manager@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !email.trim()}>
                {isSubmitting ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndFinalize} className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label
                  htmlFor="v-code"
                  className="text-xs uppercase text-muted-foreground font-bold">
                  Verification Code
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                  <Input
                    id="v-code"
                    placeholder="123456"
                    className="pl-10 text-center tracking-widest font-mono text-lg h-11"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="m-name" className="text-xs">
                  Manager Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="m-name"
                    placeholder="John Doe"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="m-pass" className="text-xs">
                  Account Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="m-pass"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="text-xs text-blue-600 p-0 h-auto"
                onClick={handleResendCode}
                disabled={resendTimer > 0 || isSubmitting}>
                {resendTimer > 0 ? (
                  `Resend code in ${resendTimer}s`
                ) : (
                  <span className="flex items-center gap-1">
                    <RefreshCcw size={12} /> Resend Code
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setStep("invite")}>
                Change Email
              </Button>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting || code.length < 6}>
                {isSubmitting ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  "Finalize Assignment"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
