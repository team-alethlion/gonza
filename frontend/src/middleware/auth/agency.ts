import { NextResponse } from "next/server";

/**
 * 🛡️ AGENCY PROXY MIDDLEWARE
 * Handles all access logic for /agency/* routes.
 * Validates role, subscription status, and onboarding completion.
 */
export const agencyProxy = (auth: any, nextUrl: any) => {
  const user = auth?.user as any;
  const role = user?.role?.toLowerCase();
  
  // 1. SESSION CHECK: If no user, redirect to login
  if (!user) {
    return NextResponse.redirect(new URL("/public/login", nextUrl));
  }

  // 2. SUPERADMIN BYPASS: Global system admins have unrestricted access
  if (role === 'superadmin') {
    return true;
  }

  // 3. SUBSCRIPTION GUARD: Validates active dates and statuses
  const subStatus = user.subscriptionStatus;
  const subExpiry = user.subscriptionExpiry;
  const trialEnd = user.trialEndDate;
  
  const now = new Date();
  const isTrialActive = subStatus === 'trial' && trialEnd && new Date(trialEnd) > now;
  const isSubActive = subStatus === 'active' && subExpiry && new Date(subExpiry) > now;

  /**
   * 🚀 RECOVERY BYPASS: 
   * If the user is technically 'active' but the cookie date is expired (isSubActive is false), 
   * we let them through to the /agency layout. 
   * The Layout's server-side guard (StrictGuard) will then fetch the fresh date from the 
   * database and either sync the session or show the "Re-authentication Required" screen.
   */
  const needsSync = subStatus === 'active' && !isSubActive;
  
  if (!isTrialActive && !isSubActive && !needsSync) {
    console.log(`[AgencyProxy] ❌ Access Denied: Subscription Expired or Invalid (${subStatus})`);
    return NextResponse.redirect(new URL("/subscription", nextUrl));
  }

  // 4. ONBOARDING GUARD: Must have completed onboarding
  if (user.isOnboarded === false) {
    console.log(`[AgencyProxy] ❌ Not Onboarded. Redirecting to /onboarding`);
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }

  // 5. ROLE-BASED ACCESS CONTROL (RBAC)
  if (role === 'admin' || role === 'owner') {
    return true;
  }

  // manager, supervisor, staff roles
  if (['manager', 'supervisor', 'staff'].includes(role)) {
    // Protect specific admin-only sub-paths (e.g., Business Management)
    const isAdminOnlyPath = nextUrl.pathname.startsWith("/agency/business-management")
    if (isAdminOnlyPath) {
      return NextResponse.redirect(new URL("/agency", nextUrl))
    }
    return true;
  }
  
  // Default fallback for unknown roles
  return NextResponse.redirect(new URL("/public/login", nextUrl));
};
