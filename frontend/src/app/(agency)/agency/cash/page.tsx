"use client";

import React, { useState } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import CashContent from "@/components/cash/CashContent";
import { CashAccountFormData } from "@/types/cash";
import { useCashAccountRedirect } from "@/hooks/useCashAccountRedirect";
import { useProfiles } from "@/contexts/ProfileContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

const Cash = () => {
  const { currentBusiness, isLoading: businessLoading } = useBusiness();
  const router = useRouter();
  const { accounts, isLoading, createAccount, refreshAccounts } =
    useCashAccounts();
  const { hasPermission, isLoading: profilesLoading } = useProfiles();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Handle redirect to last visited cash account
  useCashAccountRedirect(accounts);

  const handleCreateAccount = async (data: CashAccountFormData) => {
    try {
      await createAccount(data);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error creating account:", error);
    }
  };

  const handleAccountDeleted = async () => {
    // Refresh accounts list when an account is deleted
    await refreshAccounts();
  };

  if (businessLoading || isLoading || profilesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasPermission("finance", "view")) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view finance/cash accounts. Please
            contact your administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push("/")} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const canCreate = hasPermission("finance", "create");

  return (
    <div className="space-y-6 p-4 md:p-0">
      <h1 className="text-2xl md:text-3xl font-bold">Finance</h1>

      <CashContent
        accounts={accounts}
        isLoading={businessLoading || !currentBusiness || isLoading}
        isDialogOpen={isDialogOpen}
        onDialogOpenChange={setIsDialogOpen}
        onCreateAccount={handleCreateAccount}
        onAccountDeleted={handleAccountDeleted}
        canCreate={canCreate}
      />
    </div>
  );
};

export default Cash;
