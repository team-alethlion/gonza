/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { getProductsAction, getProductCategoriesAction } from "@/app/actions/products";
import { getBusinessLocationsAction } from "@/app/actions/business";
import { getGlobalInventoryStatsAction } from "@/app/actions/analytics";
import { getSoldItemsReportAction } from "@/app/actions/inventory";
import InventoryClient from "./InventoryClient";
import { Product, ProductCategory } from "@/types";

export default async function InventoryPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const branchId = (session?.user as any)?.branchId;

  let initialProducts: Product[] = [];
  let initialCount = 0;
  let initialStats = null;
  let initialCategories: ProductCategory[] = [];
  const initialTopSelling: any[] = [];

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

        const [productsResult, statsResult, categoriesResult]: [any, any, any] = await Promise.all([
          getProductsAction({
            userId,
            businessId: activeBranchId,
            page: 1,
            pageSize: 50,
          }),
          getGlobalInventoryStatsAction(activeBranchId),
          getProductCategoriesAction(activeBranchId),
        ]);

        if (productsResult && productsResult.products) {
          initialProducts = productsResult.products;
          initialCount = productsResult.count || 0;
        }

        if (statsResult?.success) {
          initialStats = statsResult.data;
        }

        if (categoriesResult?.success) {
          initialCategories = categoriesResult.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            createdAt: item.created_at ? new Date(item.created_at) : undefined
          }));
        }
      }
    } catch (error) {
      console.error("Failed to prefetch inventory data SSR:", error);
    }
  }

  return (
    <>
      <InventoryClient
        initialProducts={initialProducts}
        initialCount={initialCount}
        initialStats={initialStats}
        initialTopSelling={initialTopSelling}
        initialCategories={initialCategories}
      />
    </>
  );
}
