/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "@/auth";
import { getBusinessLocationsAction } from "./business";
import { getAccountStatusAction } from "./business-settings";

import { getAnalyticsSummaryAction } from "./analytics";
import { getBusinessSettingsAction } from "./business-settings";
import { djangoFetch } from "@/lib/django-client";
import { signOut } from "@/auth";
import { cache } from "react";

/**
 * 🚀 PERFORMANCE: Wrapped in React.cache to deduplicate across nested layouts.
 */
const getCachedInitialAppData = cache(async () => {
  const start = Date.now();
  let isUnauthorized = false;

  try {
    const session = await auth();
    if (!session || !session.user) {
      return {
        success: true,
        data: {
          session: null,
          locations: [],
          accountStatus: null,
          profiles: [],
          currentBranchId: null,
          businessSettings: null,
          analyticsSummary: null,
        },
      };
    }

    const userId = session.user.id as string;
    const branchId = (session.user as any).branchId;
    const userRole = (session.user as any).role?.toLowerCase();

    console.log(`[PERF] AppInit starting for user ${userId} (${userRole})`);

    // SUPER STRICT CHECK: If not superadmin, check subscription and onboarding before fetching ANY data
    if (userRole !== "superadmin") {
      let subStatus = (session.user as any).subscriptionStatus;
      let subExpiry = (session.user as any).subscriptionExpiry;
      let trialEnd = (session.user as any).trialEndDate;
      let isOnboarded = (session.user as any).isOnboarded;

      const now = new Date();
      let isTrialActive =
        subStatus === "trial" && trialEnd && new Date(trialEnd) > now;
      let isSubActive =
        subStatus === "active" && subExpiry && new Date(subExpiry) > now;

      // IF SESSION SEEMS EXPIRED, DO A REAL-TIME BACKEND CHECK AS A FALLBACK
      if (!isTrialActive && !isSubActive) {
        console.log(
          `[AppInit] Session stale (expired). Re-verifying via Django API...`,
        );
        try {
          const freshUser = await djangoFetch("users/users/me/", {
            cache: "no-store",
            accessToken: (session as any).accessToken
          });
          if (freshUser) {
            const freshAgency = freshUser.agency || {};
            subStatus = freshAgency.subscription_status;
            trialEnd = freshAgency.trial_end_date;
            subExpiry = freshAgency.subscription_expiry;
            isOnboarded = freshUser.is_onboarded;

            isTrialActive =
              subStatus === "trial" && trialEnd && new Date(trialEnd) > now;
            isSubActive =
              subStatus === "active" && subExpiry && new Date(subExpiry) > now;
            console.log(
              `[AppInit] API Re-verification: Status=${subStatus}, Valid=${
                isTrialActive || isSubActive
              }`,
            );
          }
        } catch (e) {
          console.error("[AppInit] API Fallback check failed:", e);
        }
      }

      console.log(
        `[AppInit] Final Check: Sub=${subStatus}, Onboarded=${isOnboarded}, Valid=${
          isTrialActive || isSubActive
        }`,
      );

      if ((!isTrialActive && !isSubActive) || !isOnboarded) {
        console.log(
          `[AppInit] Strict Skip: Sub=${subStatus}, Onboarded=${isOnboarded}, TrialValid=${isTrialActive}, SubValid=${isSubActive}`,
        );
        return {
          success: true,
          data: {
            session: session,
            locations: [],
            accountStatus: null,
            profiles: [],
            currentBranchId: null,
            businessSettings: null,
            analyticsSummary: null,
            isUnauthorized: false,
          },
        };
      }
    }

    // 🚀 SSR: Parallel fetch for Shell Essentials
    // If branchId is already in session, fetch settings in parallel to save time.
    const promises: Promise<any>[] = [
      getBusinessLocationsAction(userId, session),
      getAccountStatusAction(userId, session),
    ];

    if (branchId) {
      promises.push(getBusinessSettingsAction(branchId, session));
    }

    const [locationsData, accountStatusData, maybeSettings] = await Promise.all(
      promises,
    );

    const locations = locationsData || [];

    // Finalize branch ID from fetched locations if not in session
    let targetBranchId = branchId;
    if (!targetBranchId && locations.length > 0) {
      targetBranchId =
        locations.find((l: any) => l.is_default)?.id || locations[0].id;
    }

    // Now fetch settings if we didn't fetch them in parallel (due to missing branchId in session)
    let businessSettings = maybeSettings || null;
    if (targetBranchId && !businessSettings) {
        businessSettings = await getBusinessSettingsAction(targetBranchId, session);
    }

    const end = Date.now();

    console.log(`[PERF] AppInit (Full Optimized Shell) took ${end - start}ms`);

    return {
      success: true,
      data: {
        session: session,
        locations: locations,
        accountStatus: accountStatusData,
        profiles: [],
        currentBranchId: targetBranchId,
        businessSettings: businessSettings,
        analyticsSummary: null,
        isUnauthorized: false,
      },
    };
  } catch (error: any) {
    console.error("[AppInit] Error:", error);

    // If we get an Unauthorized error, the session is orphaned (database changed or user deleted)
    if (
      error.message?.includes("401:") ||
      error.message?.includes("Authentication credentials")
    ) {
      return { success: true, data: { isUnauthorized: true } };
    }

    return { success: false, error: error.message };
  }
});

/**
 * Public Server Action entry point.
 */
export async function getInitialAppDataAction() {
  return await getCachedInitialAppData();
}
