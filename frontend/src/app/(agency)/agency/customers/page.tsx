/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import { enforceStrictAccess } from "@/lib/strict-guard";
import { getCustomersAction } from "@/app/actions/customers";
import { getBusinessLocationsAction } from "@/app/actions/business";
import CustomersClient from "./CustomersClient";
import { Customer } from "@/hooks/useCustomers";

export default async function CustomersPage() {
  await enforceStrictAccess();
  const session = await auth();
  const userId = session?.user?.id;
  const branchId = (session?.user as any)?.branchId;

  let initialCustomers: Customer[] = [];
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
        const result: any = await getCustomersAction(activeBranchId, 0, 50);

        if (result && result.success && result.data) {
          // Format exactly as the hook expects it
          initialCustomers = (result.data.customers || []).map(
            (customer: any) => ({
              id: customer.id,
              fullName: customer.fullName || customer.name,
              phoneNumber: customer.phoneNumber || customer.phone,
              email: customer.email,
              birthday: customer.birthday ? new Date(customer.birthday) : null,
              gender: customer.gender,
              location: customer.location || customer.address,
              categoryId: customer.categoryId,
              notes: customer.notes,
              tags: customer.tags,
              branchId: customer.branchId,
              socialMedia: customer.socialMedia || null,
              createdAt: new Date(customer.createdAt),
              updatedAt: new Date(customer.updatedAt),
              lifetimeValue: customer.lifetimeValue || 0,
              orderCount: customer.orderCount || 0,
            }),
          );
          initialCount = result.data.count || 0;
        }
      }
    } catch (error) {
      console.error("Failed to prefetch customers data SSR:", error);
    }
  }

  return (
    <CustomersClient
      initialCustomers={initialCustomers as any}
      initialCount={initialCount}
    />
  );
}
