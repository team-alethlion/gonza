'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lock, LogOut } from 'lucide-react';

/**
 * 🛡️ AGENCY GLOBAL ERROR BOUNDARY
 * Handles specialized errors like REAUTHENTICATION_REQUIRED and UNAUTHORIZED
 * providing a clear path to recovery.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    // 🔍 Log to monitoring service if available
    console.error("[Agency Error Boundary]:", error.message || error);
  }, [error]);

  const isReauth = error.message === "REAUTHENTICATION_REQUIRED";
  const isUnauthorized = error.message === "UNAUTHORIZED";

  if (isReauth) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 px-4 text-center">
        <div className="bg-orange-100 p-4 rounded-full">
            <AlertCircle className="w-12 h-12 text-orange-600" />
        </div>
        <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900">Session Expired</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
                Your security session has timed out. To protect your data, please log in again to continue managing your agency.
            </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => signOut({ callbackUrl: '/public/login' })}
            size="lg"
            className="gap-2 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20"
          >
            <LogOut className="w-4 h-4" />
            Log In Again
          </Button>
          <Button
            onClick={() => reset()}
            variant="outline"
            size="lg"
          >
            Try Refreshing
          </Button>
        </div>
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 px-4 text-center">
        <div className="bg-red-100 p-4 rounded-full">
            <Lock className="w-12 h-12 text-red-600" />
        </div>
        <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900">Unauthorized Access</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
                You do not have the required permissions to view this section or your session has been revoked. 
                Please contact your administrator or try logging in again.
            </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => signOut({ callbackUrl: '/public/login' })}
            size="lg"
            className="gap-2 font-bold shadow-lg"
          >
            Log In Again
          </Button>
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            size="lg"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 px-4 text-center">
      <div className="bg-gray-100 p-4 rounded-full">
          <AlertCircle className="w-12 h-12 text-gray-600" />
      </div>
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        {error.message || 'An unexpected error occurred while loading this section.'}
      </p>
      <div className="flex flex-col items-center gap-4 pt-4">
        <Button
          onClick={() => reset()}
          size="lg"
          className="font-bold min-w-[200px]"
        >
          Try again
        </Button>
        <button
          onClick={() => signOut({ callbackUrl: '/public/login' })}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <LogOut className="w-3 h-3" />
          Click here to logout
        </button>
      </div>
    </div>
  );
}
