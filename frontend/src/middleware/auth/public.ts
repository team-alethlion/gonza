/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

export const publicProxy = (auth: any, nextUrl: any) => {
  const isLoggedIn = !!auth?.user
  const role = (auth?.user as any)?.role?.toLowerCase()
  const status = (auth?.user as any)?.status

  if (isLoggedIn) {
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
