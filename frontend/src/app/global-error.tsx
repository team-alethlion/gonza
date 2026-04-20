"use client";

import { signOut } from "next-auth/react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
          <div className="max-w-md w-full space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-gray-900">Critical Error</h1>
              <p className="text-muted-foreground">
                A critical application error occurred. Please try again or sign out.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <pre className="mt-4 p-4 bg-red-50 text-red-700 text-xs rounded-lg overflow-auto max-h-40 text-left">
                  {error.message}
                </pre>
              )}
            </div>

            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => reset()}
                className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
              
              <p className="text-sm text-muted-foreground">
                Want to switch accounts?{" "}
                <button
                  onClick={() => signOut({ callbackUrl: "/public/login" })}
                  className="text-red-600 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  Click here to logout
                </button>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
