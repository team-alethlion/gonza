/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

export const publicProxy = (auth: any, nextUrl: any) => {
  const isLoggedIn = !!auth?.user
  const user = auth?.user as any;
  const role = user?.role?.toLowerCase()
  const status = user?.status
  const subStatus = user?.subscriptionStatus

  if (isLoggedIn) {
    // 🛡️ RESTRICTION CHECK: Do not redirect if the user is restricted
    // This prevents redirect loops for Suspended or Expired accounts
    const isSuspended = status === 'SUSPENDED' || subStatus === 'suspended';
    const isExpired = status === 'EXPIRED';
    
    if (isSuspended || isExpired) {
      return true; // Allow them to stay on the public page (e.g. /public/suspended)
    }

    if (['superadmin', 'admin', 'manager', 'supervisor'].includes(role)) {
      // Check status first
      if (status === 'PENDING_VERIFICATION') {
        return NextResponse.redirect(new URL("/verify-email", nextUrl))
      }
      // Redirect to /agency where the strict layout guard will validate subscription/onboarding
      return NextResponse.redirect(new URL("/agency", nextUrl))
    }
  }
  return true
};
