/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { getActivityHistoryAction, getActivityStatsAction } from "@/app/actions/activity";
import { getBusinessLocationsAction } from "@/app/actions/business";
import HistoryClient from "./HistoryClient";
import { ActivityFilters } from "@/types";

export default async function ActivityHistoryPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const branchId = (session?.user as any)?.branchId;

  let initialActivities: any = { activities: [], count: 0 };
  let initialStats: any = null;

  if (userId) {
    try {
      let activeBranchId = branchId;

      if (!activeBranchId) {
        const locations: any = await getBusinessLocationsAction(userId);
        if (locations && locations.length > 0) {
          const defaultBusiness =
            locations.find((b: any) => b.is_default) || locations[0];
          activeBranchId = defaultBusiness.id;
        }
      }

      if (activeBranchId) {
        // Parallel prefetch for performance
        const [historyResult, statsResult] = await Promise.all([
          getActivityHistoryAction(activeBranchId, userId, 1, 20),
          getActivityStatsAction(activeBranchId)
        ]);

        if (historyResult && historyResult.success) {
          initialActivities = historyResult.data;
        }
        if (statsResult && statsResult.success) {
          initialStats = statsResult.data;
        }
      }
    } catch (error) {
      console.error("Failed to prefetch activity history SSR:", error);
    }
  }

  return <HistoryClient initialActivities={initialActivities} initialStats={initialStats} />;
}
