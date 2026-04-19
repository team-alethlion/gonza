/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Mail,
  ShieldAlert,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PaymentCallbackInner = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<
    "loading" | "success" | "failed" | "error"
  >("loading");
  const [message, setMessage] = useState(
    "Verifying your payment with the gateway...",
  );
  const [details, setDetails] = useState<any>(null);

  const orderTrackingId = searchParams.get("OrderTrackingId");
  const purchaseId = searchParams.get("purchase_id");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderTrackingId) {
        setStatus("error");
        setMessage("Missing tracking identifier from the payment gateway.");
        return;
      }

      try {
        setStatus("loading");

        const response = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderTrackingId, purchaseId }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            setStatus("error");
            setMessage(errData.error || "A server error occurred during verification.");
            return;
        }

        const data = await response.json();

        if (data.success === false) {
          setStatus("failed");
          setMessage(data.error || "The transaction was declined or verification failed.");
          return;
        }

        const isCompleted = data.payment_status === "completed";
        setDetails(data);

        if (isCompleted) {
          setStatus("success");
          setMessage(`Success! Your account has been updated.`);
          setTimeout(() => router.push("/agency"), 3000);
        } else if (data.payment_status === "failed") {
          setStatus("failed");
          setMessage("The transaction was declined by the provider.");
        } else {
          setStatus("loading");
          setMessage("Waiting for final confirmation. This may take a moment...");
          setTimeout(() => window.location.reload(), 6000);
        }
      } catch (error: any) {
        setStatus("error");
        setMessage("Connection interrupted. Please check your network.");
      }
    };

    verifyPayment();
  }, [orderTrackingId, purchaseId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200/60 rounded-xl overflow-hidden">
        <CardHeader className={`text-white py-6 ${
          status === 'success' ? 'bg-emerald-600' : 
          status === 'failed' ? 'bg-red-600' : 
          status === 'error' ? 'bg-amber-600' : 'bg-blue-700'
        }`}>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-bold tracking-tight uppercase">
              {status === "loading" && "Processing"}
              {status === "success" && "Success"}
              {status === "failed" && "Declined"}
              {status === "error" && "Interrupt"}
            </CardTitle>
            {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : 
             status === "success" ? <CheckCircle2 className="w-5 h-5" /> :
             status === "failed" ? <XCircle className="w-5 h-5" /> :
             <AlertCircle className="w-5 h-5" />}
          </div>
        </CardHeader>
        
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-4">
          {status === "loading" && (
             <div className="flex flex-col items-center gap-4 py-4">
                <Clock className="w-12 h-12 text-blue-100 animate-pulse" />
                <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-[280px]">
                    {message}
                </p>
             </div>
          )}

          {status === "success" && details && (
            <div className="space-y-6">
               <div className="space-y-1">
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    +{details.value_added} {details.is_subscription ? 'Days' : 'SMS Credits'}
                  </p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    Added to your account
                  </p>
               </div>
               
               <div className="bg-slate-50 rounded-lg p-4 text-xs text-left border border-slate-100 space-y-2 font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reference:</span>
                    <span className="font-mono text-slate-600">{details.merchant_reference}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 border-slate-100">
                    <span className="text-slate-400">Status:</span>
                    <Badge className="bg-emerald-100 text-emerald-700 border-none shadow-none h-5 px-2 text-[10px] font-black uppercase">Completed</Badge>
                  </div>
               </div>
            </div>
          )}

          {(status === 'failed' || status === 'error') && (
            <div className="py-2 space-y-3">
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                <p className="text-sm font-semibold text-slate-700 leading-relaxed italic">
                  "{message}"
                </p>
              </div>
              <p className="text-xs text-slate-400 max-w-[300px] mx-auto">
                No funds were deducted for failed attempts. You can safely try again or contact our support team.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 p-6 pt-0">
          {status !== "loading" ? (
            <div className="w-full space-y-5">
              {/* Clean Text Button for Dashboard */}
              <button 
                onClick={() => router.push("/agency")}
                className="w-full text-sm font-bold text-slate-900 hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                Return to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
              
              {(status === 'failed' || status === 'error') && (
                <div className="flex flex-col items-center gap-4 border-t pt-4 border-slate-100">
                    <div className="flex gap-6">
                        {/* Simple Text (Not Bold) for Retry */}
                        <button 
                            onClick={() => window.location.reload()}
                            className="text-xs text-slate-500 hover:text-amber-600 transition-colors flex items-center gap-1.5"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Retry Sync
                        </button>
                        
                        <button 
                            onClick={() => window.location.href = "mailto:support@gonzasystems.com"}
                            className="text-xs text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                        >
                            <Mail className="w-3 h-3" />
                            Get Help
                        </button>
                    </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full text-center py-2">
                <span className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em]">
                  Encrypted & Secure
                </span>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

const PaymentCallback = () => (
  <Suspense
    fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    }>
    <PaymentCallbackInner />
  </Suspense>
);

export default PaymentCallback;
