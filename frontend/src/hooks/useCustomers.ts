/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/contexts/BusinessContext";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCustomersAction,
  createCustomerAction,
  updateCustomerAction,
  deleteCustomerAction,
} from "@/app/actions/customers";
import { useAuth } from "@/components/auth/AuthProvider";
import { mapDbCustomerToCustomer } from "@/utils/customerMapping";

export interface Customer {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  email: string | null;
  birthday: Date | null;
  gender: string | null;
  location: string | null;
  categoryId: string | null; // Added category field
  notes: string | null;
  tags: string[] | null;
  branchId: string;
  socialMedia: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  } | null;
  lifetimeValue?: number;
  orderCount?: number;
  creditLimit?: number;
  createdAt: Date;
  updatedAt: Date;
}

import { localDb } from "@/lib/dexie";

export const useCustomers = (
  initialPageSize: number = 50,
  initialData?: { customers: Customer[]; count: number }
) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const queryClient = useQueryClient();

  const loadCustomers = useCallback(async (): Promise<{
    customers: Customer[];
    count: number;
  }> => {
    if (!currentBusiness) {
      return { customers: [], count: 0 };
    }

    try {
      const result = await getCustomersAction(
        currentBusiness.id,
        page,
        pageSize,
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      const formattedCustomers: Customer[] = (result.data?.customers || []).map(
        (customer: any) => mapDbCustomerToCustomer(customer)
      );

      // Background Dexie sync for first page
      if (formattedCustomers.length > 0 && page === 1) {
         const cacheData = formattedCustomers.map(c => ({
           ...c,
           locationId: currentBusiness.id as string,
         }));
         localDb.customers.where('locationId').equals(currentBusiness.id).delete().then(() => {
            localDb.customers.bulkPut(cacheData as any);
         });
      }

      return { customers: formattedCustomers, count: result.data?.count || 0 };
    } catch (error) {
      console.error("Error loading customers:", error);
      return { customers: [], count: 0 };
    }
  }, [currentBusiness?.id, page, pageSize]);

  // React Query caching
  const queryKey = ["customers", currentBusiness?.id, page, pageSize];
  const {
    data: queriedData,
    isLoading: isQueryLoading,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: loadCustomers,
    enabled: !!currentBusiness?.id,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    initialData: (page === 1 && initialData?.customers.length) ? initialData : undefined
  });

  const customers = queriedData?.customers || [];
  const totalCount = queriedData?.count || 0;

  // Derived loading state to avoid flash on background refetch
  const isLoading = isQueryLoading && !queriedData;

  const createCustomer = async (
    customerData: Omit<Customer, "id" | "createdAt" | "updatedAt">,
  ) => {
    if (!currentBusiness) {
      toast({
        title: "Error",
        description: "No business selected",
        variant: "destructive",
      });
      return null;
    }

    try {
      if (!user) throw new Error("User not authenticated");

      const result = await createCustomerAction(
        currentBusiness.id,
        user.id,
        customerData,
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to create customer");
      }

      const newCustomer = mapDbCustomerToCustomer(result.data);

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["customers", currentBusiness.id] });
      queryClient.invalidateQueries({ queryKey: ["customer_stats", currentBusiness.id] });

      // Log activity
      await logActivity({
        activityType: "CREATE",
        module: "CUSTOMERS",
        entityType: "customer",
        entityId: newCustomer.id,
        entityName: newCustomer.fullName,
        description: `Created customer "${newCustomer.fullName}"`,
        metadata: {
          phoneNumber: newCustomer.phoneNumber,
          email: newCustomer.email,
          location: newCustomer.location,
        },
      });

      toast({
        title: "Success",
        description: "Customer created successfully",
      });

      return result.data;
    } catch (error) {
      console.error("Error creating customer:", error);
      toast({
        title: "Error",
        description: "Failed to create customer. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const addCustomer = createCustomer;

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      if (!currentBusiness) throw new Error("No business selected");

      const result = await updateCustomerAction(id, currentBusiness.id, updates);

      if (!result.success)
        throw new Error(result.error || "Failed to update customer");

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["customers", currentBusiness.id] });

      // Log activity
      const customer = customers.find((c) => c.id === id);
      if (customer) {
        await logActivity({
          activityType: "UPDATE",
          module: "CUSTOMERS",
          entityType: "customer",
          entityId: id,
          entityName: customer.fullName,
          description: `Updated customer "${customer.fullName}"`,
          metadata: { updates },
        });
      }

      toast({
        title: "Success",
        description: "Customer updated successfully",
      });

      return true;
    } catch (error) {
      console.error("Error updating customer:", error);
      toast({
        title: "Error",
        description: "Failed to update customer. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const customer = customers.find((c) => c.id === id);

      if (!currentBusiness) throw new Error("No business selected");

      const result = await deleteCustomerAction(id, currentBusiness.id);

      if (!result.success)
        throw new Error(result.error || "Failed to delete customer");

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["customers", currentBusiness.id] });
      queryClient.invalidateQueries({ queryKey: ["customer_stats", currentBusiness.id] });

      // Log activity
      if (customer) {
        await logActivity({
          activityType: "DELETE",
          module: "CUSTOMERS",
          entityType: "customer",
          entityId: id,
          entityName: customer.fullName,
          description: `Deleted customer "${customer.fullName}"`,
          metadata: {
            phoneNumber: customer.phoneNumber,
            email: customer.email,
          },
        });
      }

      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });

      return true;
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Initial load handled by React Query; no manual trigger needed

  // Realtime: invalidate customer list when changes occur for this location
  // Commented out since we are moving away from Supabase client realtime subscriptions
  // useEffect(() => {
  //   if (!currentBusiness?.id) return;

  //   const channel = supabase
  //     .channel('customers_changes')
  //     .on('postgres_changes', {
  //       event: '*',
  //       schema: 'public',
  //       table: 'customers',
  //       filter: `location_id=eq.${currentBusiness.id}`
  //     }, () => {
  //       queryClient.invalidateQueries({ queryKey });
  //     })
  //     .subscribe();

  //   return () => {
  //     supabase.removeChannel(channel);
  //   };
  // }, [currentBusiness?.id, page, pageSize]);

  return {
    customers,
    isLoading,
    createCustomer,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    loadCustomers,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
  };
};
