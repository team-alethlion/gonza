/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { enforceStrictAccess } from "@/lib/strict-guard";
import { getProductsAction } from "@/app/actions/products";
import { getBusinessLocationsAction } from "@/app/actions/business";
import InventoryClient from "./InventoryClient";
import { Product } from "@/types";

export default async function InventoryPage() {
  await enforceStrictAccess();
  const session = await auth();
  const userId = session?.user?.id;
  const branchId = (session?.user as any)?.branchId;

  let initialProducts: Product[] = [];
  let initialCount = 0;

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
        const result: any = await getProductsAction({
          userId,
          businessId: activeBranchId,
          page: 1,
          pageSize: 50,
        });

        if (result && result.products) {
          initialProducts = result.products;
          initialCount = result.count || 0;
        }
      }
    } catch (error) {
      console.error("Failed to prefetch inventory data SSR:", error);
    }
  }

  return (
    <InventoryClient
      initialProducts={initialProducts}
      initialCount={initialCount}
    />
  );
}
