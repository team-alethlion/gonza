/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { getCustomersAction } from "@/app/actions/customers";
import CustomersClient from "./CustomersClient";
import { Customer } from "@/hooks/useCustomers";
import { mapDbCustomerToCustomer } from "@/utils/customerMapping";

export default async function CustomersPage() {
  const session = await auth();
  const branchId = (session?.user as any)?.branchId;

  let initialCustomers: Customer[] = [];
  let initialCount = 0;

  if (branchId) {
    try {
      const result: any = await getCustomersAction(branchId, 1, 50);

      if (result && result.success && result.data) {
        initialCustomers = (result.data.customers || []).map(
          (customer: any) => mapDbCustomerToCustomer(customer)
        );
        initialCount = result.data.count || 0;
      }
    } catch (error) {
      console.error("Failed to prefetch customers data SSR:", error);
    }
  }

  return (
    <CustomersClient
      initialCustomers={initialCustomers}
      initialCount={initialCount}
    />
  );
}
