import { NextResponse } from "next/server";

export const subscriptionProxy = (auth: any, nextUrl: any) => {
  const isLoggedIn = !!auth?.user
  const user = auth?.user as any;
  const role = user?.role?.toLowerCase();

  if (!isLoggedIn) {
     return NextResponse.redirect(new URL("/public/login", nextUrl));
  }
  
  if (role === 'superadmin') return true;

  // If they ALREADY have an active sub/trial, don't let them stay here
  const subStatus = user?.subscriptionStatus;
  const subExpiry = user?.subscriptionExpiry;
  const trialEnd = user?.trialEndDate;
  const isOnboarded = user?.isOnboarded;

  const now = new Date();
  const isTrialActive = subStatus === 'trial' && trialEnd && new Date(trialEnd) > now;
  const isSubActive = subStatus === 'active' && subExpiry && new Date(subExpiry) > now;

  if (isTrialActive || isSubActive) {
    // Subscription is valid, where should they go?
    if (isOnboarded) {
      return NextResponse.redirect(new URL("/agency", nextUrl));
    } else {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
  }

  return true; 
};
