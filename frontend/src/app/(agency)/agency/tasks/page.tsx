/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { getTasksAction, getTaskStatsAction } from "@/app/actions/tasks";
import { getBusinessLocationsAction } from "@/app/actions/business";
import TasksClient from "./TasksClient";

export default async function TasksPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const branchId = (session?.user as any)?.branchId;

  let initialTasks: any[] = [];
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
        const [tasksResult, statsResult] = await Promise.all([
          getTasksAction(userId, activeBranchId),
          getTaskStatsAction(userId, activeBranchId)
        ]);

        if (tasksResult && tasksResult.success) {
          initialTasks = tasksResult.data || [];
        }
        if (statsResult && statsResult.success) {
          initialStats = statsResult.data;
        }
      }
    } catch (error) {
      console.error("Failed to prefetch tasks SSR:", error);
    }
  }

  return <TasksClient initialTasks={initialTasks} initialStats={initialStats} />;
}
