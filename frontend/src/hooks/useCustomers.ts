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
  createdAt: Date;
  updatedAt: Date;
}

import { localDb } from "@/lib/dexie";

export const useCustomers = (
  initialPageSize: number = 50,
  initialData?: { customers: Customer[]; count: number }
) => {
  const [customers, setCustomers] = useState<Customer[]>(initialData?.customers || []);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(initialData?.count || 0);
  const { toast } = useToast();
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const queryClient = useQueryClient();

  // Load from Dexie cache on mount
  useEffect(() => {
    const loadFromCache = async () => {
      if (currentBusiness?.id && customers.length === 0) {
        const cached = await localDb.customers
          .where('locationId')
          .equals(currentBusiness.id)
          .reverse()
          .sortBy('createdAt');
        
        if (cached && cached.length > 0) {
          console.log('[Customers] Loaded from Dexie cache');
          const mapped = cached.map(c => ({
            ...c,
            birthday: c.birthday ? new Date(c.birthday) : null,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt)
          }));
          setCustomers(page === 1 ? mapped.slice(0, pageSize) : []);
          setTotalCount(mapped.length);
        }
      }
    };
    loadFromCache();
  }, [currentBusiness?.id, page, pageSize]);

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
        page, // ⚡️ FIX: Pass page number, not skip/offset
        pageSize,
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      const formattedCustomers: Customer[] = (result.data?.customers || []).map(
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
          creditLimit: customer.creditLimit || 0,
        }),
      );

      // Update Dexie cache in the background (only if we're on page 1 to avoid complexity)
      if (formattedCustomers.length > 0 && page === 1) {
         const cacheData = formattedCustomers.map(c => ({
           ...c,
           locationId: currentBusiness.id as string,
         }));
         await localDb.customers.where('locationId').equals(currentBusiness.id).delete();
         await localDb.customers.bulkPut(cacheData as any);
      }

      return { customers: formattedCustomers, count: result.data?.count || 0 };
    } catch (error) {
      console.error("Error loading customers:", error);
      toast({
        title: "Error",
        description: "Failed to load customers. Please try again.",
        variant: "destructive",
      });
      return { customers: [], count: 0 };
    }
  }, [currentBusiness?.id, page, pageSize, toast]);

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
    refetchOnReconnect: false,
    initialData: (page === 1 && initialData?.customers.length) ? initialData : undefined
  });

  useEffect(() => {
    if (queriedData) {
      setCustomers(queriedData.customers);
      setTotalCount(queriedData.count);
    }
  }, [queriedData]);

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

      const insertData = {
        fullName: customerData.fullName,
        phoneNumber: customerData.phoneNumber || null,
        email: customerData.email || null,
        birthday: customerData.birthday?.toISOString().split("T")[0] || null,
        gender: customerData.gender || null,
        location: customerData.location || null,
        categoryId: customerData.categoryId || null,
        notes: customerData.notes || null,
        tags: customerData.tags || null,
        socialMedia: customerData.socialMedia || null,
        creditLimit: (customerData as any).creditLimit || 0
      };

      const result = await createCustomerAction(
        currentBusiness.id,
        user.id,
        insertData,
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to create customer");
      }

      const data = result.data;

      // Format the new customer and update cache immediately
      const newCustomer: Customer = {
        id: data.id,
        fullName: data.name,
        phoneNumber: data.phone,
        email: data.email,
        birthday: data.birthday ? new Date(data.birthday) : null,
        gender: data.gender,
        location: data.address,
        categoryId: data.categoryId,
        notes: data.notes,
        tags: data.tags,
        branchId: data.branchId || currentBusiness?.id || '',
        socialMedia: data.socialMedia as any,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };

      // Update local state immediately
      setCustomers((prev) => [newCustomer, ...prev]);
      setTotalCount((c) => c + 1);

      // Update React Query cache immediately
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return { customers: [newCustomer], count: 1 };
        return {
          customers: [newCustomer, ...oldData.customers],
          count: (oldData.count || 0) + 1,
        };
      });

      // Log activity
      await logActivity({
        activityType: "CREATE",
        module: "CUSTOMERS",
        entityType: "customer",
        entityId: data.id,
        entityName: customerData.fullName,
        description: `Created customer "${customerData.fullName}"`,
        metadata: {
          phoneNumber: customerData.phoneNumber,
          email: customerData.email,
          location: customerData.location,
        },
      });

      toast({
        title: "Success",
        description: "Customer created successfully",
      });

      return data;
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
      const updateData: any = {};

      if (updates.fullName !== undefined)
        updateData.fullName = updates.fullName;
      if (updates.phoneNumber !== undefined)
        updateData.phoneNumber = updates.phoneNumber;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.birthday !== undefined)
        updateData.birthday = updates.birthday?.toISOString();
      if (updates.gender !== undefined) updateData.gender = updates.gender;
      if (updates.location !== undefined)
        updateData.location = updates.location;
      if (updates.categoryId !== undefined)
        updateData.categoryId = updates.categoryId;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.socialMedia !== undefined)
        updateData.socialMedia = updates.socialMedia;
      if ((updates as any).creditLimit !== undefined)
        updateData.creditLimit = (updates as any).creditLimit;

      if (!currentBusiness) throw new Error("No business selected");

      const result = await updateCustomerAction(id, currentBusiness.id, updateData);

      if (!result.success)
        throw new Error(result.error || "Failed to update customer");

      // Update local state immediately
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      );

      // Update React Query cache immediately
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          customers: oldData.customers.map((c: Customer) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        };
      });

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
      // Get customer details before deletion
      const customer = customers.find((c) => c.id === id);

      if (!currentBusiness) throw new Error("No business selected");

      const result = await deleteCustomerAction(id, currentBusiness.id);

      if (!result.success)
        throw new Error(result.error || "Failed to delete customer");
      // Optimistic update: remove locally
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setTotalCount((c) => Math.max(0, c - 1));
      // Update cache immediately for current page
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        const { customers: oldCustomers, count } = old;
        const newCustomers = (oldCustomers as Customer[]).filter(
          (c) => c.id !== id,
        );
        return {
          customers: newCustomers,
          count: Math.max(0, (count || 0) - 1),
        };
      });
      queryClient.invalidateQueries({ queryKey });

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
