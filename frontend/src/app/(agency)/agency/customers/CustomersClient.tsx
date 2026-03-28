"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCustomers, Customer } from "@/hooks/useCustomers";
import { useCustomerCategories } from "@/hooks/useCustomerCategories";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useSalesData } from "@/hooks/useSalesData";
import { useRouter, useSearchParams } from "next/navigation";
import { getCustomerStatsAction } from "@/app/actions/customers";
import CustomerPageSkeleton from "@/components/customers/CustomerPageSkeleton";
import CustomerHeader from "@/components/customers/CustomerHeader";
import CustomerStatsCards from "@/components/customers/CustomerStatsCards";
import CustomerContent from "@/components/customers/CustomerContent";
import BirthdayCard from "@/components/customers/BirthdayCard";
import CustomerCategoryManager from "@/components/customers/CustomerCategoryManager";
import NewCustomerDialog from "@/components/customers/NewCustomerDialog";
import MergeCustomersDialog from "@/components/customers/MergeCustomersDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useProfiles } from "@/contexts/ProfileContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";

const CustomersClient = ({
  initialCustomers,
  initialCount,
}: {
  initialCustomers?: Customer[];
  initialCount?: number;
}) => {
  const { user } = useAuth();
  const { currentBusiness, isLoading: businessLoading } = useBusiness();
  const {
    customers,
    isLoading,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
  } = useCustomers(50, {
    customers: initialCustomers || [],
    count: initialCount || 0,
  });
  const { categories } = useCustomerCategories();
  const { settings } = useBusinessSettings();

  // We no longer need all sales on the client for lifetime stats
  // const { getCustomerLifetimePurchases } = useSalesData(user?.id);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | undefined>(
    undefined,
  );
  const [activeTab, setActiveTab] = useState("list");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hasPermission, isLoading: profilesLoading } = useProfiles();

  // Permissions
  const canView = hasPermission("customers", "view");
  const canCreate = hasPermission("customers", "create");
  const canEdit = hasPermission("customers", "edit");
  const canDelete = hasPermission("customers", "delete");

  // Duplicate detection
  const [showDuplicatesDialog, setShowDuplicatesDialog] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<Customer[][]>([]);
  const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState<
    Customer[] | null
  >(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  // Global customer stats
  const [customersWithBirthdaysAll, setCustomersWithBirthdaysAll] = useState<
    number | undefined
  >(undefined);
  const [customersThisMonthAll, setCustomersThisMonthAll] = useState<
    number | undefined
  >(undefined);

  // Fetch global customer stats with 5-min cache
  useEffect(() => {
    let cancelled = false;
    const loadGlobalStats = async () => {
      if (!user?.id || !currentBusiness?.id) return;

      const cacheKey = `allCustomerStats_${currentBusiness.id}`;
      const cachedRaw = localStorage.getItem(cacheKey);
      try {
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as {
            withBirthdays: number;
            thisMonth: number;
            ts: number;
          };
          if (Date.now() - cached.ts < 5 * 60 * 1000) {
            setCustomersWithBirthdaysAll(cached.withBirthdays);
            setCustomersThisMonthAll(cached.thisMonth);
            return;
          }
        }
      } catch {}

      const result = await getCustomerStatsAction(user.id, currentBusiness.id);

      if (!cancelled && result.success && result.data) {
        setCustomersWithBirthdaysAll(result.data.withBirthdays);
        setCustomersThisMonthAll(result.data.thisMonth);

        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              withBirthdays: result.data.withBirthdays,
              thisMonth: result.data.thisMonth,
              ts: Date.now(),
            }),
          );
        } catch {}
      }
    };

    loadGlobalStats();
    return () => {
      cancelled = true;
    };
  }, [user?.id, currentBusiness?.id]);

  // Use customer data hook for all calculations
  const { validCategories, filteredCustomers, customerStats, getCategoryName } =
    useCustomerData(
      customers,
      categories,
      searchTerm,
      selectedCategory,
      totalCount,
      customersWithBirthdaysAll,
      customersThisMonthAll,
    );

  useEffect(() => {
    const actionParam = searchParams.get("action");
    if (actionParam === "new") {
      // Clear URL state first
      router.replace("/customers");
      // Then trigger dialog
      setTimeout(() => setNewCustomerDialogOpen(true), 0);
    }

    const viewCustomerId = searchParams.get("view");
    if (viewCustomerId && customers.length > 0) {
      const customer = customers.find((c) => c.id === viewCustomerId);
      if (customer && selectedCustomer?.id !== customer.id) {
        setTimeout(() => {
          setSelectedCustomer(customer);
          setActiveTab("details");
        }, 0);
      }
    }
  }, [searchParams, customers, router, selectedCustomer?.id]);

  // Memoize handlers to prevent unnecessary re-renders
  const handleAddNewCustomer = useCallback(
    async (customerData: Omit<Customer, "id" | "createdAt" | "updatedAt">) => {
      if (customerToEdit) {
        await updateCustomer(customerToEdit.id, customerData);
      } else {
        await createCustomer(customerData);
      }
      setNewCustomerDialogOpen(false);
      setCustomerToEdit(undefined);
      return true;
    },
    [customerToEdit, updateCustomer, createCustomer],
  );

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveTab("details");
  }, []);

  const handleEditCustomer = useCallback((customer: Customer) => {
    setCustomerToEdit(customer);
    setNewCustomerDialogOpen(true);
  }, []);

  const handleAddNewCustomerClick = useCallback(() => {
    setCustomerToEdit(undefined);
    setNewCustomerDialogOpen(true);
  }, []);

  const findDuplicates = useCallback(async () => {
    if (!currentBusiness?.id) return;
    
    try {
      const { getDuplicateCustomersAction } = await import('@/app/actions/customers');
      const result = await getDuplicateCustomersAction(currentBusiness.id);
      
      if (result.success && result.data) {
        if (result.data.length === 0) {
          toast.info("No duplicate customers found");
          return;
        }
        setDuplicateGroups(result.data);
        setShowDuplicatesDialog(true);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to scan for duplicates");
    }
  }, [currentBusiness?.id]);

  const handleMergeGroup = (group: Customer[]) => {
    setSelectedDuplicateGroup(group);
    setShowMergeDialog(true);
  };

  const handleMergeComplete = () => {
    // Reload customers after merge
    window.location.reload();
  };

  if (businessLoading || !currentBusiness || isLoading || profilesLoading) {
    return <CustomerPageSkeleton />;
  }

  if (!canView) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view the customers module. Please
            contact your administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <CustomerHeader
        onAddNewCustomer={handleAddNewCustomerClick}
        onFindDuplicates={canEdit ? findDuplicates : undefined}
        customers={filteredCustomers}
        currency={settings.currency}
        businessName={settings.businessName}
        businessLogo={settings.businessLogo}
        getCategoryName={getCategoryName}
        canCreate={canCreate}
      />

      {/* Stats Cards */}
      <CustomerStatsCards customerStats={customerStats} />

      {/* Birthday Card - Only show if there are upcoming birthdays */}
      <BirthdayCard customers={customers} />

      {/* Add Customer Category Manager */}
      <CustomerCategoryManager />

      {/* Customer Content */}
      <CustomerContent
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCustomer={selectedCustomer}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        dateRange={dateRange}
        setDateRange={setDateRange}
        validCategories={validCategories}
        filteredCustomers={filteredCustomers}
        customers={customers}
        customerStats={customerStats}
        getCategoryName={getCategoryName}
        onSelectCustomer={handleSelectCustomer}
        onEditCustomer={handleEditCustomer}
        onDeleteCustomer={deleteCustomer}
        onUpdateCustomer={updateCustomer}
        setSelectedCustomer={setSelectedCustomer}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {/* Pagination Controls - Only show for the main list tab */}
      {activeTab === 'list' && (
        <div className="flex items-center justify-between p-3 md:p-4 border rounded">
          <div className="text-xs md:text-sm text-muted-foreground">
            Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, totalCount)} of {totalCount}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-2 py-1 text-xs md:text-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1); // Reset to first page when changing page size
              }}>
              {[20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
            <button
              className="border rounded px-2 py-1 text-xs md:text-sm disabled:opacity-50"
              disabled={page === 1 || isLoading}
              onClick={() => setPage(page - 1)}
              type="button">
              Prev
            </button>
            <button
              className="border rounded px-2 py-1 text-xs md:text-sm disabled:opacity-50"
              disabled={page * pageSize >= totalCount || isLoading}
              onClick={() => setPage(page + 1)}
              type="button">
              Next
            </button>
          </div>
        </div>
      )}

      <NewCustomerDialog
        open={newCustomerDialogOpen}
        onClose={() => {
          setNewCustomerDialogOpen(false);
          setCustomerToEdit(undefined);
        }}
        onAddCustomer={handleAddNewCustomer}
        initialData={customerToEdit}
      />

      {/* Duplicates Dialog */}
      <Dialog
        open={showDuplicatesDialog}
        onOpenChange={setShowDuplicatesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Duplicate Customers Found</DialogTitle>
            <DialogDescription>
              Found {duplicateGroups.length} group(s) of duplicate customers.
              Select a group to merge.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {duplicateGroups.map((group, index) => (
              <Card key={index} className="p-4">
                <CardContent className="p-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-lg">
                        {group[0].fullName}
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        {group.length} duplicates
                      </Badge>
                    </div>
                    <Button onClick={() => handleMergeGroup(group)} size="sm">
                      Merge
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    {group.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between border-l-2 border-gray-200 pl-3 py-1">
                        <div>
                          <div>{customer.phoneNumber || "No phone"}</div>
                          <div className="text-muted-foreground text-xs">
                            Created: {customer.createdAt.toLocaleDateString()}
                          </div>
                        </div>
                        {customer.email && (
                          <div className="text-xs text-muted-foreground">
                            {customer.email}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      {selectedDuplicateGroup && (
        <MergeCustomersDialog
          open={showMergeDialog}
          onOpenChange={setShowMergeDialog}
          customers={selectedDuplicateGroup}
          onMergeComplete={handleMergeComplete}
        />
      )}
    </div>
  );
};

export default CustomersClient;
