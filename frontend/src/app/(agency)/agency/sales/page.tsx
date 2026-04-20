/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { getSalesAction, getSalesCategoriesAction } from "@/app/actions/sales";
import { getBusinessLocationsAction } from "@/app/actions/business";
import { SalesClient } from "@/components/sales/SalesClient";
import { Sale, mapDbSaleToSale, SalesCategory } from "@/types";

export default async function SalesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const branchId = (session?.user as any)?.branchId;

  let initialSales: Sale[] = [];
  let initialCategories: SalesCategory[] = [];

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
        // Fetch sales and categories in parallel for speed
        const [salesResult, categoriesResult] = await Promise.all([
          getSalesAction(activeBranchId, 1, 50, { ordering: "-date" }),
          getSalesCategoriesAction(activeBranchId)
        ]);

        if (salesResult && salesResult.success && salesResult.data?.sales) {
          const rawSales = Array.isArray(salesResult.data.sales) ? salesResult.data.sales : [];
          initialSales = rawSales.map(mapDbSaleToSale);
        }

        if (categoriesResult && categoriesResult.success) {
          initialCategories = categoriesResult.data as SalesCategory[];
        }
      }
    } catch (error) {
      console.error("Failed to prefetch sales data SSR:", error);
    }
  }

  return <SalesClient initialSales={initialSales} initialCategories={initialCategories} />;
}
