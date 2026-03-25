/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { enforceStrictAccess } from "@/lib/strict-guard";
import { getProductsAction } from "@/app/actions/products";
import { getBusinessLocationsAction } from "@/app/actions/business";
import { getGlobalInventoryStatsAction } from "@/app/actions/analytics";
import { getSoldItemsReportAction } from "@/app/actions/inventory";
import { getProfilesAction } from "@/app/actions/profiles";
import InventoryClient from "./InventoryClient";
import { Product } from "@/types";
import { ProfileProvider } from "@/contexts/ProfileContext";

export default async function InventoryPage() {
  await enforceStrictAccess();
  const session = await auth();
  const userId = session?.user?.id;
  const branchId = (session?.user as any)?.branchId;

  let initialProducts: Product[] = [];
  let initialCount = 0;
  let initialStats = null;
  let initialTopSelling = [];
  let initialProfiles = [];

  if (userId) {
    try {
      let activeBranchId = branchId;

      // Fallback if no specific branchId in session
      if (!activeBranchId) {
        const locations: any = await getBusinessLocationsAction(userId);
        if (locations && locations.length > 0) {
          const defaultBusiness =
            locations.find((b: any) => b.is_default) || locations[0];
          activeBranchId = defaultBusiness.id;
        }
      }

      if (activeBranchId) {
        // 🚀 SSR: Parallel fetch for critical inventory data only
        // We REMOVED getSoldItemsReportAction from SSR because it takes 29s+ for large datasets.
        // The client-side useSoldItemsData hook will fetch it in the background after the page loads instantly.
        
        const [productsResult, statsResult, profilesResult]: [any, any, any] = await Promise.all([
          getProductsAction({
            userId,
            businessId: activeBranchId,
            page: 1,
            pageSize: 50,
          }),
          getGlobalInventoryStatsAction(activeBranchId),
          getProfilesAction(activeBranchId)
        ]);

        if (productsResult && productsResult.products) {
          initialProducts = productsResult.products;
          initialCount = productsResult.count || 0;
        }

        if (statsResult?.success) {
          initialStats = statsResult.data;
        }

        if (profilesResult) {
          initialProfiles = profilesResult;
        }
      }
    } catch (error) {
      console.error("Failed to prefetch inventory data SSR:", error);
    }
  }

  return (
    <ProfileProvider initialProfiles={initialProfiles}>
      <InventoryClient
        initialProducts={initialProducts}
        initialCount={initialCount}
        initialStats={initialStats}
        initialTopSelling={initialTopSelling}
        initialProfiles={initialProfiles}
      />
    </ProfileProvider>
  );
}
