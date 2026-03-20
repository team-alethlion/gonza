"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBusiness } from "@/contexts/BusinessContext";
import CarriageInwardsTable from "@/components/carriage/CarriageInwardsTable";
import CarriageInwardsForm from "@/components/carriage/CarriageInwardsForm";
import { useCarriageInwards } from "@/hooks/useCarriageInwards";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useProfiles } from "@/contexts/ProfileContext";

const CarriageInwards = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { currentBusiness, isLoading: businessLoading } = useBusiness();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { settings } = useBusinessSettings();
  const { hasPermission } = useProfiles();

  const canCreate = hasPermission("inventory", "create");
  const canEdit = hasPermission("inventory", "edit");
  const canDelete = hasPermission("inventory", "delete");

  const {
    carriageInwards,
    isLoading,
    createCarriageInward,
    updateCarriageInward,
    deleteCarriageInward,
  } = useCarriageInwards();

  const [showForm, setShowForm] = useState(false);

  // Calculate summary statistics
  const totalAmount = carriageInwards.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );
  const totalEntries = carriageInwards.length;
  const uniqueSuppliers = [
    ...new Set(carriageInwards.map((item) => item.supplierName)),
  ].length;
  const thisMonthEntries = carriageInwards.filter((item) => {
    const itemDate = new Date(item.date);
    const now = new Date();
    return (
      itemDate.getMonth() === now.getMonth() &&
      itemDate.getFullYear() === now.getFullYear()
    );
  }).length;

  const handleRefresh = () => {
    // The hook already handles loading, so we just show a toast
    toast({
      title: "Data refreshed",
      description: "Carriage inwards data has been updated.",
    });
  };

  const handleEdit = (record: any) => {
    // TODO: Implement edit functionality
    console.log("Edit record:", record);
  };

  const handleView = (record: any) => {
    // TODO: Implement view functionality
    console.log("View record:", record);
  };

  if (businessLoading || !currentBusiness || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <LoadingSpinner />
        <p className="text-muted-foreground">
          Loading carriage inwards data...
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header Section - Improved Mobile Layout */}
      <div className="space-y-3 md:space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/inventory")}
              className="shrink-0 h-8 w-8"
              title="Back to inventory">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-1">
              <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-sales-dark">
                Carriage Inwards
              </h1>
              <p className="text-xs md:text-base text-muted-foreground">
                Track transportation and delivery costs for your inventory
              </p>
            </div>
          </div>

          {/* Mobile Action Buttons - Improved Layout */}
          {isMobile ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                {canCreate && (
                  <Button
                    onClick={() => setShowForm(!showForm)}
                    className="flex-1 gap-2 h-9"
                    variant={showForm ? "outline" : "default"}>
                    <Plus size={16} /> {showForm ? "Cancel" : "Add Entry"}
                  </Button>
                )}
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="icon"
                  disabled={isLoading}
                  className="shrink-0 h-9 w-9">
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>
          ) : (
            // Desktop Action Buttons
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="icon"
                disabled={isLoading}
                title="Refresh data">
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
              {canCreate && (
                <Button
                  onClick={() => setShowForm(!showForm)}
                  className="gap-2">
                  <Plus size={16} /> {showForm ? "Cancel" : "Add Entry"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards - Improved Mobile Layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-3 md:p-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-lg md:text-xl font-bold">
                {settings.currency || "USD"} {totalAmount.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3 md:p-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Entries</p>
              <p className="text-lg md:text-xl font-bold">{totalEntries}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3 md:p-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Suppliers</p>
              <p className="text-lg md:text-xl font-bold">{uniqueSuppliers}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3 md:p-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-lg md:text-xl font-bold">{thisMonthEntries}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Section */}
      {showForm && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2 md:pb-6">
            <CardTitle className="text-sm md:text-lg">
              Add New Carriage Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CarriageInwardsForm
              onSubmit={async (data) => {
                try {
                  await createCarriageInward(data);
                  setShowForm(false);
                  toast({
                    title: "Entry created",
                    description:
                      "Carriage inwards entry has been successfully created.",
                  });
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to create carriage inwards entry.",
                    variant: "destructive",
                  });
                }
              }}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Table Section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 md:pb-6">
          <CardTitle className="text-sm md:text-lg">
            Carriage Inwards Entries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <CarriageInwardsTable
            carriageInwards={carriageInwards}
            isLoading={isLoading}
            onEdit={canEdit ? handleEdit : () => {}}
            onDelete={canDelete ? deleteCarriageInward : async () => false}
            onView={handleView}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CarriageInwards;
