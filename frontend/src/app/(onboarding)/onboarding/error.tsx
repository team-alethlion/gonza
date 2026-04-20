'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 px-4 text-center">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <p className="text-muted-foreground">{error.message || 'An unexpected error occurred.'}</p>
      <div className="flex flex-col items-center gap-4">
        <Button
          onClick={() => reset()}
          variant="default"
        >
          Try again
        </Button>
        <button
          onClick={() => signOut({ callbackUrl: '/public/login' })}
          className="text-sm text-primary hover:underline"
        >
          Click here to logout
        </button>
      </div>
    </div>
  );
}
