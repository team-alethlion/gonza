/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBusiness } from "@/contexts/BusinessContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "@/hooks/use-toast";
import { Rocket, ShieldAlert, CreditCard, ChevronRight } from "lucide-react";
import {
  getSubscriptionTransactionsAction,
  initiateSubscriptionPaymentAction,
} from "@/app/actions/billing";

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({
  children,
}) => {
  const { user, signOut } = useAuth();
  const { currentBusiness } = useBusiness();
  const {
    daysRemaining,
    billingAmount,
    billingDuration,
    isLoading,
    isFrozen,
    refetch,
  } = useOnboarding(currentBusiness?.id);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [pesapalRedirectUrl, setPesapalRedirectUrl] = useState<string | null>(
    null,
  );
  const [latestPayment, setLatestPayment] = useState<any>(null);

  React.useEffect(() => {
    const fetchPaymentData = async () => {
      if (!user) return;
      try {
        const payments = await getSubscriptionTransactionsAction(user.id);
        const latest = payments && payments.length > 0 ? payments[0] : null;

        if (latest?.id) {
          setLatestPayment({
            ...latest,
            business_name: currentBusiness?.name || "Gonzo System User",
          });
        }
      } catch (err) {
        console.error("Failed to fetch payment data:", err);
      }
    };
    fetchPaymentData();
  }, [user, currentBusiness]);

  const handleDownloadInvoice = async () => {
    if (!latestPayment) return;
    const { generateSubscriptionInvoice } = await import(
      "@/utils/generateSubscriptionInvoice"
    );
    await generateSubscriptionInvoice(latestPayment, "invoice");
  };

  const handleRenew = async () => {
    if (!user) return;

    if (!billingAmount || billingAmount <= 0) {
      toast({
        title: "Plan Not Configured",
        description:
          "Your subscription plan hasn't been set by an admin yet. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    setIsInitiatingPayment(true);
    try {
      const locationId =
        currentBusiness?.id || "00000000-0000-0000-0000-000000000000";
      const phone = (user as any).phone || "0700000000";

      const result = await initiateSubscriptionPaymentAction(
        user.id,
        locationId,
        billingDuration,
        phone,
      );

      if (!result.success || !result.redirect_url) {
        throw new Error(result.error || "Failed to initiate payment");
      }

      setPesapalRedirectUrl(result.redirect_url);
    } catch (error: any) {
      console.error("Subscription Renewal Error:", error);
      toast({
        title: "Payment Error",
        description: `${
          error.message || "Unknown error"
        }. Please try again later.`,
        variant: "destructive",
      });
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <LoadingSpinner message="Verifying subscription..." />
      </div>
    );
  }

  console.log("--- [SubscriptionGate] Access Check ---");
  console.log("Days Remaining:", daysRemaining);
  console.log("Is Frozen:", isFrozen);
  console.log("Is Loading:", isLoading);

  // Only block if daysRemaining is 0 (or less)
  // We do NOT block on just isFrozen here anymore, because we want "Manual Freezes" (with days > 0)
  // to fall through to the RequiredSetupGate where they show a specific "Unusual Activity" message.
  const isLocked = daysRemaining !== undefined && daysRemaining <= 0;

  // IMPORTANT: Exclude the payment callback and other critical paths from being blocked
  // Otherwise, the user can't verify their payment because the gate blocks the callback page!
  const isPublicPath =
    window.location.pathname === "/payment-callback" ||
    window.location.pathname === "/onboarding" ||
    window.location.pathname === "/login" ||
    window.location.pathname === "/signup";

  console.log("Is Locked:", isLocked);
  console.log("Is Public Path:", isPublicPath);

  if (isLocked && !isPublicPath) {
    if (pesapalRedirectUrl) {
      return (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl border border-border/40 overflow-hidden relative flex flex-col">
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Secure Payment
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Pesapal Integrated Gateway
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPesapalRedirectUrl(null)}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            </div>
            <iframe
              src={pesapalRedirectUrl}
              className="w-full flex-1 border-none"
              title="Pesapal Payment"
            />
          </div>
          <p className="mt-4 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium opacity-60">
            Do not close this window until the payment is complete
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <div className="w-full max-w-md bg-white border border-border/40 shadow-xl rounded-lg p-10 text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 border-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 border">
            <CreditCard className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-foreground mb-3 uppercase tracking-widest">
            Subscription Expired
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Your subscription has expired. Don&apos;t worry, all your data is
            safe. Please renew your subscription to restore full access to your
            business dashboard.
          </p>

          <div className="bg-muted/30 p-4 rounded-lg border border-border/40 mb-6 text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Renewal Amount
            </p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-foreground">
                UGX {billingAmount?.toLocaleString() ?? "50,000"}
              </p>
              <span className="text-xs font-medium px-2 py-1 bg-white border border-border/60 rounded text-muted-foreground shadow-sm">
                {billingDuration}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRenew}
              disabled={isInitiatingPayment}
              className="block w-full py-2.5 bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-widest rounded transition-all hover:bg-primary/90 disabled:opacity-50">
              {isInitiatingPayment ? "Processing..." : "Renew Subscription Now"}
            </button>

            <div className="bg-muted/30 p-3 rounded-lg border border-border/40 mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Admin Support
              </p>
              <a
                href="tel:+256758519696"
                className="text-lg font-bold text-primary hover:underline block">
                +256 758519696
              </a>
            </div>

            {latestPayment && (
              <button
                onClick={handleDownloadInvoice}
                className="flex items-center justify-center gap-2 w-full py-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5 rounded transition-all border border-primary/20">
                <Rocket className="w-3.5 h-3.5 rotate-45" />
                Download {latestPayment.id.split("-")[0].toUpperCase()} Invoice
              </button>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  toast({
                    title: "Syncing status...",
                    description: "Checking for your recent payment.",
                  });
                  refetch();
                }}
                className="block w-full py-2.5 text-muted-foreground text-[10px] font-bold uppercase tracking-widest border border-border/40 rounded hover:bg-muted transition-all">
                Check Status
              </button>

              <button
                onClick={() => signOut()}
                className="block w-full py-2.5 text-muted-foreground text-[10px] font-bold uppercase tracking-widest border border-border/40 rounded hover:bg-muted transition-all">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
