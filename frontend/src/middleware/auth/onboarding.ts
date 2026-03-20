/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

export const onboardingProxy = (auth: any, nextUrl: any) => {
  const isLoggedIn = !!auth?.user
  const isOnboarded = (auth?.user as any)?.isOnboarded
  const isAgencyOnboarded = (auth?.user as any)?.agencyOnboarded

  if (!isLoggedIn) {
     return NextResponse.redirect(new URL("/public/login", nextUrl));
  }
  
  // If already onboarded, don't let them stay here
  if (isOnboarded || isAgencyOnboarded) {
    return NextResponse.redirect(new URL("/agency", nextUrl));
  }

  return true; 
};
