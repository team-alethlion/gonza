/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { getExpensesAction } from "@/app/actions/finance";
import { getBusinessLocationsAction } from "@/app/actions/business";
import ExpensesClient from "./ExpensesClient";
import { Expense } from "@/hooks/useExpenses";

export default async function ExpensesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const branchId = (session?.user as any)?.branchId;

  let initialExpenses: Expense[] = [];

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
        const result: any = await getExpensesAction(activeBranchId);
        // using arbitrary large page since Expenses frontend seemingly handles array directly.
        if (result && result.success && result.data) {
          // Format the mapped expenses if the action doesn't already return `Expense[]` perfectly
          initialExpenses = result.data.map((item: any) => ({
            id: item.id,
            amount: item.amount,
            category: item.category,
            date: new Date(item.date),
            description: item.description,
            receiptUrl: item.receiptUrl,
            receiptId: item.receiptId,
            businessLocationId: item.businessLocationId,
            recordedBy: item.recordedBy,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
          }));
        }
      }
    } catch (error) {
      console.error("Failed to prefetch expenses SSR:", error);
    }
  }

  return <ExpensesClient initialExpenses={initialExpenses as any} />;
}
