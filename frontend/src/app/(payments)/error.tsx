"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

export default function PaymentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Payments Module Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="bg-red-100 p-6 rounded-full">
            <AlertTriangle className="w-16 h-16 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Payment Error</h1>
          <p className="text-muted-foreground">
            {error.message || "An issue occurred while processing your payment details."}
          </p>
          {error.digest && (
            <p className="text-[10px] text-gray-400 font-mono mt-2">Error ID: {error.digest}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCcw className="w-4 h-4" /> Try Again
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <Home className="w-4 h-4" /> Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}