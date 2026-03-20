import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { djangoFetch } from "./django-client";

/**
 * Strict server-side guard to prevent any code execution if user is not fully active.
 * Used in Layouts and Pages to ensure maximum security.
 */
export async function enforceStrictAccess() {
  const session = await auth();
  
  if (!session || !session.user) {
    return null; // Let the layout handles login redirect
  }

  const user = session.user as any;
  const role = user.role?.toLowerCase();
  
  // Superadmins bypass everything
  if (role === 'superadmin') {
    return user;
  }

  let subStatus = user.subscriptionStatus;
  let subExpiry = user.subscriptionExpiry;
  let trialEnd = user.trialEndDate;
  let isOnboarded = user.isOnboarded;

  const now = new Date();
  let isTrialActive = subStatus === 'trial' && trialEnd && new Date(trialEnd) > now;
  let isSubActive = subStatus === 'active' && subExpiry && new Date(subExpiry) > now;

  // IF SESSION SEEMS EXPIRED, DO A REAL-TIME BACKEND CHECK AS A FALLBACK
  if (!isTrialActive && !isSubActive) {
    console.log(`[StrictGuard] Session stale (expired). Re-verifying via djangoFetch for user ${user.id}...`);
    try {
      // Using djangoFetch is safer as it handles tokens and base URL correctly
      const freshUser = await djangoFetch('users/users/me/', { cache: 'no-store' });
      
      if (freshUser) {
        const freshAgency = freshUser.agency || {};
        
        subStatus = freshAgency.subscription_status;
        trialEnd = freshAgency.trial_end_date;
        subExpiry = freshAgency.subscription_expiry;
        isOnboarded = freshUser.is_onboarded;

        isTrialActive = subStatus === 'trial' && trialEnd && new Date(trialEnd) > now;
        isSubActive = subStatus === 'active' && subExpiry && new Date(subExpiry) > now;
        
        console.log(`[StrictGuard] API Re-verification: Status=${subStatus}, Valid=${isTrialActive || isSubActive}`);
      }
    } catch (e) {
      console.error("[StrictGuard] API Fallback check failed:", e);
    }
  }

  console.log(`[StrictGuard] Final Verification:
    - Status: ${subStatus}
    - Result: ${isTrialActive || isSubActive ? 'PASS' : 'FAIL'}
  `);

  // 1. Redirect if subscription is invalid
  if (!isTrialActive && !isSubActive) {
    console.log(`[StrictGuard] REDIRECT: Subscription Invalid (${subStatus})`);
    redirect('/subscription');
  }

  // 2. Redirect if not onboarded
  if (!isOnboarded) {
    console.log(`[StrictGuard] REDIRECT: Not Onboarded`);
    redirect('/onboarding');
  }

  return user;
}
