/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Loader,
  AlertCircle,
  Rocket,
  ArrowRight,
} from "lucide-react";

const PaymentCallbackInner = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<
    "loading" | "success" | "failed" | "cancelled"
  >("loading");
  const [message, setMessage] = useState(
    "Verifying your payment with PesaPal...",
  );
  const [details, setDetails] = useState<any>(null);

  const orderTrackingId = searchParams.get("OrderTrackingId");
  const purchaseId = searchParams.get("purchase_id");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderTrackingId) {
        console.error(
          "[PaymentCallback] No OrderTrackingId found in URL parameters.",
        );
        setStatus("failed");
        setMessage(
          "Missing payment reference. We couldn't track this transaction.",
        );
        return;
      }

      try {
        console.log("--- [PaymentCallback] Initiating Verification ---");
        console.log("Tracking ID:", orderTrackingId);
        console.log("Purchase ID:", purchaseId);

        setStatus("loading");

        // Use the new dedicated API route
        const response = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderTrackingId, purchaseId }),
        });
        const data = await response.json();

        if (!response.ok) {
          console.error("[PaymentCallback] HTTP error:", response.status);
          throw new Error(`HTTP ${response.status}`);
        }

        console.log("[PaymentCallback] Backend Response:", data);

        const result = data;
        const isSubscription = result.is_subscription;

        if (result.success === false) {
          console.error("[PaymentCallback] Business Error:", result.error);
          setStatus("failed");
          setMessage(result.error || "Verification failed on the server.");
          return;
        }

        const isCompleted = result.payment_status === "completed";
        setDetails(result);

        if (isCompleted) {
          setStatus("success");
          setMessage(
            `Access Restored! Your subscription has been extended by ${result.value_added} days.`,
          );

          // Redirect after a short delay
          setTimeout(() => {
            router.push("/agency");
          }, 4000);
        } else if (result.payment_status === "failed") {
          setStatus("failed");
          setMessage(
            "The transaction was declined by PesaPal. Please try again.",
          );
        } else {
          // Fallback for pending or unknown states
          setStatus("loading");
          setMessage(
            "Your payment is still being processed by the network. Please wait...",
          );

          // Auto-refresh
          setTimeout(() => {
            window.location.reload();
          }, 6000);
        }
      } catch (error: any) {
        console.error("[PaymentCallback] Unexpected Error:", error);
        setStatus("failed");
        setMessage(
          error.message ||
            "An unexpected error occurred while verifying your payment.",
        );
      }
    };

    verifyPayment();
  }, [orderTrackingId, purchaseId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafafa] p-6">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="bg-white border border-border/40 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.06)] rounded-3xl p-10 text-center relative overflow-hidden">
          {/* Premium Header Gradient */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

          <div className="mb-10 relative">
            {status === "loading" && (
              <div className="w-24 h-24 bg-blue-50/50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto border border-blue-100/50 relative overflow-hidden">
                <Loader className="w-10 h-10 animate-spin relative z-10" />
                <div className="absolute inset-0 bg-blue-100/20 animate-pulse" />
              </div>
            )}
            {status === "success" && (
              <div className="w-24 h-24 bg-green-50/50 text-green-600 rounded-3xl flex items-center justify-center mx-auto border border-green-100/50 rotate-3 scale-110 duration-500">
                <CheckCircle className="w-12 h-12 -rotate-3" />
              </div>
            )}
            {status === "failed" && (
              <div className="w-24 h-24 bg-red-50/50 text-red-600 rounded-3xl flex items-center justify-center mx-auto border border-red-100/50 rotate-3">
                <XCircle className="w-12 h-12 -rotate-3" />
              </div>
            )}
            {status === "cancelled" && (
              <div className="w-24 h-24 bg-amber-50/50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-100/50 rotate-3">
                <AlertCircle className="w-12 h-12 -rotate-3" />
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-4 font-inter tracking-tight">
            {status === "loading" && "Verifying Payment"}
            {status === "success" && "Payment Successful"}
            {status === "failed" && "Transaction Failed"}
            {status === "cancelled" && "Payment Cancelled"}
          </h1>

          <p className="text-[15px] text-muted-foreground leading-relaxed mb-10 px-4">
            {message}
          </p>

          {status === "success" && details && (
            <div className="bg-[#f8faff] rounded-2xl p-6 border border-blue-50/50 mb-10 text-left animate-in slide-in-from-bottom-2 duration-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600/60">
                  Subscription Details
                </span>
                <Rocket className="w-3 h-3 text-blue-500" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-foreground font-bold text-lg">
                    {details.value_added} Days Access
                  </p>
                  <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/80">
                    Value Added to Account
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-foreground/40 font-mono text-[10px] truncate max-w-[100px]">
                    {details.tracking_id}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {status !== "loading" && (
              <button
                onClick={() => router.push("/agency")}
                className="group relative w-full h-14 bg-foreground text-background font-bold text-[12px] uppercase tracking-widest rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden shadow-lg shadow-black/5">
                <span className="relative z-10 flex items-center gap-2">
                  Continue to Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}

            {status === "loading" && (
              <div className="py-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium opacity-60 animate-pulse">
                  Secured by PesaPal
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground/40 font-medium">
          &copy; {new Date().getFullYear()} Gonza Systems. All rights reserved.
        </p>
      </div>
    </div>
  );
};

const PaymentCallback = () => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
    <PaymentCallbackInner />
  </Suspense>
);

export default PaymentCallback;
