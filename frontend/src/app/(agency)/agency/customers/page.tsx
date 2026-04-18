/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { getCustomersAction, getCustomerSummaryAction } from "@/app/actions/customers";
import CustomersClient from "./CustomersClient";
import { Customer } from "@/hooks/useCustomers";
import { mapDbCustomerToCustomer } from "@/utils/customerMapping";

export default async function CustomersPage() {
  const session = await auth();
  const branchId = (session?.user as any)?.branchId;

  let initialCustomers: Customer[] = [];
  let initialCount = 0;
  let initialSummary = null;

  if (branchId) {
    try {
      // 🚀 PERFORMANCE: Fetch list and summary in parallel
      const [listResult, summaryResult] = await Promise.all([
        getCustomersAction(branchId, 1, 50),
        getCustomerSummaryAction(branchId)
      ]);

      if (listResult && listResult.success && listResult.data) {
        initialCustomers = listResult.data.customers || [];
        initialCount = listResult.data.count || 0;
      }

      if (summaryResult && summaryResult.success) {
        initialSummary = summaryResult.data;
      }
    } catch (error) {
      console.error("Failed to prefetch customers data SSR:", error);
    }
  }

  return (
    <CustomersClient
      initialCustomers={initialCustomers}
      initialCount={initialCount}
      initialSummary={initialSummary}
    />
  );
}
