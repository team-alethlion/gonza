/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { getBusinessLocationsAction } from "@/app/actions/business";
import { getCustomersAction, getCustomerCategoriesAction } from "@/app/actions/customers";
import { getCashAccountsAction } from "@/app/actions/finance";
import { getSalesCategoriesAction } from "@/app/actions/sales";
import NewSaleClient from "./NewSaleClient";

export default async function NewSalePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const branchId = (session?.user as any)?.branchId;

  let initialCustomers = [];
  let initialCategories = [];
  let initialCustomerCategories = [];
  let initialAccounts = [];

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
        // Prefetch all data needed for the new sale form in parallel
        const [customersResult, categoriesResult, customerCategoriesResult, accountsResult] = await Promise.all([
          getCustomersAction(activeBranchId, 1, 100),
          getSalesCategoriesAction(activeBranchId),
          getCustomerCategoriesAction(activeBranchId),
          getCashAccountsAction(activeBranchId)
        ]);

        if (customersResult.success && customersResult.data?.customers) {
          initialCustomers = customersResult.data.customers;
        }

        if (categoriesResult.success) {
          initialCategories = categoriesResult.data;
        }

        if (customerCategoriesResult.success) {
          initialCustomerCategories = customerCategoriesResult.data;
        }

        if (accountsResult.success) {
          initialAccounts = accountsResult.data;
        }
      }
    } catch (error) {
      console.error("Failed to prefetch new sale data SSR:", error);
    }
  }

  return (
    <NewSaleClient 
      initialCustomers={initialCustomers}
      initialCategories={initialCategories}
      initialCustomerCategories={initialCustomerCategories}
      initialAccounts={initialAccounts}
    />
  );
}
