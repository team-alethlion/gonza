/* eslint-disable @typescript-eslint/no-explicit-any */
import AgencyDashboardClient from "../components/AgencyDashboardClient";
import { auth } from "@/auth";
import { getSalesAction } from "@/app/actions/sales";
import { getAnalyticsSummaryAction } from "@/app/actions/analytics";
import { getBusinessLocationsAction } from "@/app/actions/business";
import { Sale, mapDbSaleToSale, AnalyticsData } from "@/types";

export default async function AgencyDashboard() {
  const session = await auth();
  const userId = session?.user?.id;
  const branchId = (session?.user as any)?.branchId;

  let initialSales: Sale[] = [];
  let initialAnalytics: AnalyticsData | null = null;

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
        // 🛡️ DEV STABILITY: Fetch sequentially instead of using Promise.all
        // This gives the single-threaded Django server room to breathe
        const salesResult = await getSalesAction(activeBranchId, 1, 20);
        const analyticsResult = await getAnalyticsSummaryAction(activeBranchId);

        const salesData = salesResult?.success ? salesResult.data?.sales : [];

        if (salesData && salesData.length > 0) {
          initialSales = salesData.map((item: any) =>
            mapDbSaleToSale(item),
          );
        }

        if (analyticsResult?.success) {
          initialAnalytics = analyticsResult.data as {
            totalSales: number;
            totalCost: number;
            totalProfit: number;
            paidSalesCount: number;
            pendingSalesCount: number;
            totalExpenses: number;
            recentSales: any;
          };
        }
      }
    } catch (error) {
      console.error("Failed to prefetch dashboard data SSR:", error);
    }
  }

  return (
    <AgencyDashboardClient
      initialSales={initialSales}
      initialAnalytics={initialAnalytics}
    />
  );
}
