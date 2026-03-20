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
        // getExpensesAction returns { success: true, data: { expenses: [], count: 0 } }
        if (result && result.success && result.data?.expenses) {
          const rawExpenses = Array.isArray(result.data.expenses) ? result.data.expenses : [];
          
          initialExpenses = rawExpenses.map((item: any) => ({
            id: item.id,
            amount: item.amount,
            category: item.category,
            date: new Date(item.date),
            description: item.description,
            receiptUrl: item.receipt_image || item.receiptUrl,
            receiptId: item.receiptId,
            businessLocationId: item.branch || item.businessLocationId,
            recordedBy: item.user || item.recordedBy,
            createdAt: new Date(item.created_at || item.createdAt),
            updatedAt: new Date(item.updated_at || item.updatedAt),
          }));
        }
      }
    } catch (error) {
      console.error("Failed to prefetch expenses SSR:", error);
    }
  }

  return <ExpensesClient initialExpenses={initialExpenses as any} />;
}
