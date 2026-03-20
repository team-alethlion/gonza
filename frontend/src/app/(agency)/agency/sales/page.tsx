/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { enforceStrictAccess } from "@/lib/strict-guard";
import { getSalesAction } from "@/app/actions/sales";
import { getBusinessLocationsAction } from "@/app/actions/business";
import { SalesClient } from "@/components/sales/SalesClient";
import { Sale, mapDbSaleToSale } from "@/types";

export default async function SalesPage() {
  await enforceStrictAccess();
  const session = await auth();
  const userId = session?.user?.id;
  const branchId = (session?.user as any)?.branchId;

  let initialSales: Sale[] = [];

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
        const salesData: any = await getSalesAction(
          activeBranchId,
          "desc",
          undefined,
        );

        if (salesData && salesData.length > 0) {
          initialSales = salesData.map((item: any) =>
            mapDbSaleToSale({
              id: item.id,
              user_id: item.user_id,
              location_id: item.location_id,
              receipt_number: item.receipt_number,
              customer_name: item.customer_name,
              customer_address: item.customer_address,
              customer_contact: item.customer_contact,
              customer_id: item.customer_id,
              items: item.items as any,
              payment_status: item.payment_status,
              profit: item.profit ? Number(item.profit) : 0,
              total: item.total ? Number(item.total) : 0,
              total_cost: item.total_cost ? Number(item.total_cost) : 0,
              subtotal: item.subtotal ? Number(item.subtotal) : 0,
              discount: item.discount ? Number(item.discount) : 0,
              tax_amount: item.tax_amount ? Number(item.tax_amount) : 0,
              date: item.date,
              tax_rate: item.tax_rate || 0,
              created_at: item.created_at,
              updated_at: item.updated_at,
              cash_transaction_id: item.cash_transaction_id,
              amount_paid: item.amount_paid
                ? Number(item.amount_paid)
                : undefined,
              amount_due: item.amount_due ? Number(item.amount_due) : undefined,
              category_id: item.category_id,
              notes: item.notes,
            }),
          );
        }
      }
    } catch (error) {
      console.error("Failed to prefetch sales data SSR:", error);
    }
  }

  return <SalesClient initialSales={initialSales} />;
}
