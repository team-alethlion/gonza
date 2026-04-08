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
