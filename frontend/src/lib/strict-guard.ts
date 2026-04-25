import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { djangoFetch } from "./django-client";
import { cookies } from "next/headers";

/**
 * Strict server-side guard to prevent any code execution if user is not fully active.
 * Used in Layouts and Pages to ensure maximum security.
 */
export async function enforceStrictAccess(session?: any) {
  const activeSession = session || (await auth());
  
  if (!activeSession || !activeSession.user) {
    return { user: null, syncNeeded: false };
  }

  const user = activeSession.user as any;
  const role = user.role?.toLowerCase();
  
  // Superadmins bypass everything
  if (role === 'superadmin') {
    return { user, syncNeeded: false };
  }

  let subStatus = user.subscriptionStatus;
  let subExpiry = user.subscriptionExpiry;
  let trialEnd = user.trialEndDate;
  let isOnboarded = user.isOnboarded;
  let syncNeeded = false;

  const now = new Date();
  let isTrialActive = subStatus === 'trial' && trialEnd && new Date(trialEnd) > now;
  let isSubActive = subStatus === 'active' && subExpiry && new Date(subExpiry) > now;

  const isTokenDead = (activeSession as any).authError === "RefreshAccessTokenError";

  /**
   * 🔄 REAL-TIME SYNCHRONIZATION
   * If either subscription OR onboarding appears invalid in the session, 
   * we perform a one-time real-time fetch from the database to ensure 
   * we are not acting on stale cookie data.
   */
  const subSeemsInvalid = !isTrialActive && !isSubActive;
  const onboardingSeemsIncomplete = !isOnboarded;

  if ((subSeemsInvalid || onboardingSeemsIncomplete) && !isTokenDead) {
    console.log(`[StrictGuard] Verification required (Sub: ${!subSeemsInvalid}, Onboarded: ${!onboardingSeemsIncomplete}). Fetching truth from DB...`);
    try {
      const freshUser = await djangoFetch('users/users/me/', { 
        cache: 'no-store',
        accessToken: (activeSession as any).accessToken 
      });
      
      if (freshUser) {
        const freshAgency = freshUser.agency || {};
        
        // Update local variables with Database Truth
        subStatus = freshAgency.subscription_status;
        trialEnd = freshAgency.trial_end_date;
        subExpiry = freshAgency.subscription_expiry;
        isOnboarded = freshUser.is_onboarded;

        // Re-calculate active status based on fresh DB data
        isTrialActive = subStatus === 'trial' && trialEnd && new Date(trialEnd) > now;
        isSubActive = subStatus === 'active' && subExpiry && new Date(subExpiry) > now;
        
        console.log(`[StrictGuard] DB Truth -> Status: ${subStatus}, Onboarded: ${isOnboarded}`);
        
        // Signal a session sync if the DB is ahead of the Cookie
        if ((isTrialActive || isSubActive) && subSeemsInvalid) {
           syncNeeded = true;
        }
      }
    } catch (e) {
      console.error("[StrictGuard] real-time verification failed:", e);
    }
  }

  /**
   * 🛡️ SEQUENTIAL ENFORCEMENT
   * Priority 1: Subscription (Must be active to proceed)
   * Priority 2: Onboarding (Only checked if Subscription is valid)
   */
  
  // 1. Subscription Check
  if (!isTrialActive && !isSubActive) {
    console.log(`[StrictGuard] ❌ Access Denied: Subscription Invalid (${subStatus})`);
    redirect('/subscription');
  }

  // 2. Onboarding Check (Reached only if Subscription is valid)
  if (!isOnboarded) {
    console.log(`[StrictGuard] ❌ Access Denied: Onboarding Incomplete`);
    redirect('/onboarding');
  }

  console.log(`[StrictGuard] ✅ Access Granted (Status: ${subStatus}, Onboarded: true)`);
  return { user, syncNeeded };
}
