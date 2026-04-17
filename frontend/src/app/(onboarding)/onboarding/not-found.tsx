'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 px-4 text-center">
      <h2 className="text-2xl font-bold">Page Not Found</h2>
      <p className="text-muted-foreground">Could not find requested resource</p>
      <div className="flex flex-col items-center gap-4">
        <Button asChild>
          <Link href="/">
            Go Home
          </Link>
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
