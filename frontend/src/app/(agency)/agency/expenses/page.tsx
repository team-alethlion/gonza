/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { getExpensesAction, getExpenseStatsAction } from "@/app/actions/finance";
import { getBusinessLocationsAction } from "@/app/actions/business";
import ExpensesClient from "./ExpensesClient";
import { Expense } from "@/hooks/useExpenses";

export default async function ExpensesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const branchId = (session?.user as any)?.branchId;

  let initialExpenses: Expense[] = [];
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
        const [expensesResult, statsResult] = await Promise.all([
          getExpensesAction(activeBranchId),
          getExpenseStatsAction(activeBranchId)
        ]);

        if (expensesResult && expensesResult.success && expensesResult.data?.expenses) {
          const rawExpenses = Array.isArray(expensesResult.data.expenses) ? expensesResult.data.expenses : [];
          
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

        if (statsResult && statsResult.success) {
          initialStats = statsResult.data;
        }
      }
    } catch (error) {
      console.error("Failed to prefetch expenses SSR:", error);
    }
  }

  return <ExpensesClient initialExpenses={initialExpenses as any} initialStats={initialStats} />;
}
