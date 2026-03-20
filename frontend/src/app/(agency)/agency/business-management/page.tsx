"use client";

import React, { useState } from "react";
import {
  Plus,
  Building2,
  Trash2,
  Pencil,
  Check,
  RotateCcw,
  Download,
  Upload,
  Lock,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { NewBusinessDialog } from "@/components/business/NewBusinessDialog";
import { ResetBusinessDialog } from "@/components/business/ResetBusinessDialog";
import { BackupDialog } from "@/components/business/BackupDialog";
import { RestoreDialog } from "@/components/business/RestoreDialog";
import { BusinessPasswordDialog } from "@/components/business/BusinessPasswordDialog";
import { BusinessPasswordManager } from "@/components/business/BusinessPasswordManager";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBusinessPassword } from "@/hooks/useBusinessPassword";
import { useProfiles } from "@/contexts/ProfileContext";

const BusinessManagement = () => {
  const {
    businessLocations,
    currentBusiness,
    switchBusiness,
    updateBusiness,
    deleteBusiness,
    resetBusiness,
    locationLimit,
  } = useBusiness();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const {
    setBusinessPassword,
    verifyBusinessPassword,
    removeBusinessPassword,
  } = useBusinessPassword();
  const { hasPermission } = useProfiles();
  const canManage = hasPermission("settings", "manage");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Password protection states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showPasswordManager, setShowPasswordManager] = useState(false);
  const [passwordPromptData, setPasswordPromptData] = useState<{
    businessId: string;
    businessName: string;
    onVerified: () => void;
  } | null>(null);
  const [managingPasswordBusinessId, setManagingPasswordBusinessId] = useState<
    string | null
  >(null);

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    const success = await updateBusiness(editingId, editingName.trim());

    if (success) {
      toast({
        title: "Success",
        description: "Business name updated successfully",
      });
      setEditingId(null);
      setEditingName("");
    } else {
      toast({
        title: "Error",
        description: "Failed to update business name",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    const success = await deleteBusiness(deletingId);

    if (success) {
      toast({
        title: "Success",
        description: "Business deleted successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete business",
        variant: "destructive",
      });
    }

    setDeletingId(null);
  };

  const handleSwitchBusiness = (businessId: string) => {
    switchBusiness(businessId, (businessId, businessName, onVerified) => {
      setPasswordPromptData({ businessId, businessName, onVerified });
      setShowPasswordDialog(true);
    });
  };

  const handlePasswordVerified = () => {
    if (passwordPromptData) {
      passwordPromptData.onVerified();
      toast({
        title: "Business Switched",
        description: "You are now working with the selected business",
      });
    }
  };

  const handlePasswordManagerOpen = (businessId: string) => {
    setManagingPasswordBusinessId(businessId);
    setShowPasswordManager(true);
  };

  const handlePasswordSet = (businessId: string, hasPassword: boolean) => {
    // Update the business location in the state to reflect password change
    businessLocations.map((location) =>
      location.id === businessId
        ? {
            ...location,
            switch_password_hash: hasPassword ? "has_password" : undefined,
          }
        : location,
    );
    // This is a local state update - the actual data will be refreshed on next load
  };

  const handleReset = async () => {
    if (!resettingId) return;

    setIsResetting(true);
    console.log("Starting reset for business:", resettingId);

    try {
      const success = await resetBusiness(resettingId);

      if (success) {
        toast({
          title: "Success",
          description: "Business location has been reset successfully",
        });
        console.log("Reset completed successfully");
        // Reload the page after successful reset
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast({
          title: "Error",
          description: "Failed to reset business location",
          variant: "destructive",
        });
        console.error("Reset failed");
      }
    } catch (error) {
      console.error("Error during reset:", error);
      toast({
        title: "Error",
        description: "Failed to reset business location",
        variant: "destructive",
      });
    } finally {
      setResettingId(null);
      setIsResetting(false);
    }
  };

  const getResettingBusinessName = () => {
    const business = businessLocations.find((b) => b.id === resettingId);
    return business?.name || "";
  };

  const handleCreateNewClick = () => {
    if (businessLocations.length >= locationLimit) {
      setShowLimitDialog(true);
    } else {
      setShowNewDialog(true);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 relative">
      {/* Reset Progress Overlay */}
      {isResetting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4 w-full">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <h3 className="text-lg font-semibold text-gray-900">
                Resetting Business
              </h3>
              <p className="text-sm text-gray-600">
                Clearing all data for &quot;{getResettingBusinessName()}
                &quot;...
                <br />
                <span className="text-xs text-gray-500 mt-1 block">
                  Please don&apos;t close this window. This may take a few
                  moments.
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
      <div className={isResetting ? "pointer-events-none opacity-50" : ""}>
        {/* Header */}
        <div className="space-y-3 md:space-y-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Business Management
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                Manage your business locations and settings
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex gap-2">
                {canManage && (
                  <Button
                    onClick={() => setShowBackupDialog(true)}
                    variant="outline"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2"
                    size={isMobile ? "default" : "default"}
                    disabled={!currentBusiness || isResetting}>
                    <Download className="h-4 w-4" />
                    {isMobile ? "Backup" : "Backup Data"}
                  </Button>
                )}
                {canManage && (
                  <Button
                    onClick={() => setShowRestoreDialog(true)}
                    variant="outline"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2"
                    size={isMobile ? "default" : "default"}
                    disabled={!currentBusiness || isResetting}>
                    <Upload className="h-4 w-4" />
                    {isMobile ? "Restore" : "Restore Data"}
                  </Button>
                )}
              </div>
              {canManage && (
                <Button
                  onClick={handleCreateNewClick}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                  size={isMobile ? "default" : "default"}
                  disabled={isResetting}>
                  <Plus className="h-4 w-4" />
                  Create New Business
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Current Business */}
        {currentBusiness && (
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-800 text-lg md:text-xl">
                <div className="p-2 bg-blue-200 rounded-lg">
                  <Building2 className="h-5 w-5" />
                </div>
                Current Business
              </CardTitle>
              <CardDescription className="text-blue-600 text-sm">
                You are currently working with this business
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg md:text-xl text-blue-900">
                    {currentBusiness.name}
                  </h3>
                  <p className="text-sm text-blue-600">
                    Created:{" "}
                    {new Date(currentBusiness.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {currentBusiness.is_default && (
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 text-xs">
                      Default
                    </Badge>
                  )}
                  <Badge className="bg-green-500 text-white text-xs">
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Businesses */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg md:text-xl">All Businesses</CardTitle>
            <CardDescription className="text-sm">
              Manage your business locations. You can switch between them, edit
              their names, reset them, or delete them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {businessLocations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Building2 className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium">
                    No businesses found
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Create your first business to get started
                  </p>
                </div>
              ) : (
                businessLocations.map((business) => (
                  <div
                    key={business.id}
                    className={`p-4 border rounded-xl transition-all ${
                      currentBusiness?.id === business.id
                        ? "border-blue-300 bg-blue-50/50 shadow-sm"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`p-2 rounded-lg ${
                            currentBusiness?.id === business.id
                              ? "bg-blue-200"
                              : "bg-gray-100"
                          }`}>
                          <Building2 className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingId === business.id ? (
                            <div className="space-y-2">
                              <Label
                                htmlFor={`edit-${business.id}`}
                                className="text-sm font-medium">
                                Business Name
                              </Label>
                              <Input
                                id={`edit-${business.id}`}
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-9"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEdit();
                                  if (e.key === "Escape") handleCancelEdit();
                                }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h4 className="font-semibold text-gray-900 text-base">
                                  {business.name}
                                </h4>
                                {business.switch_password_hash && (
                                  <Lock className="h-4 w-4 text-amber-500" />
                                )}
                                {business.is_default && (
                                  <Badge variant="outline" className="text-xs">
                                    Default
                                  </Badge>
                                )}
                                {currentBusiness?.id === business.id && (
                                  <Badge className="text-xs bg-green-500 text-white">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                Created:{" "}
                                {new Date(
                                  business.created_at,
                                ).toLocaleDateString()}
                                {business.switch_password_hash && (
                                  <span className="text-amber-600 ml-2">
                                    • Password Protected
                                  </span>
                                )}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:flex-shrink-0">
                        {editingId === business.id ? (
                          <div className="flex gap-2 w-full md:w-auto">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              className="flex-1 md:flex-none">
                              <Check className="h-4 w-4 md:mr-1" />
                              <span className="md:inline">Save</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              className="flex-1 md:flex-none">
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 w-full md:w-auto">
                            {currentBusiness?.id !== business.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleSwitchBusiness(business.id)
                                }
                                className="flex-1 md:flex-none text-sm"
                                disabled={isResetting}>
                                Switch To
                              </Button>
                            )}
                            {canManage && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleStartEdit(business.id, business.name)
                                }
                                className="p-2"
                                disabled={isResetting}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canManage && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handlePasswordManagerOpen(business.id)
                                }
                                className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                title={
                                  business.switch_password_hash
                                    ? "Manage Password"
                                    : "Set Password"
                                }
                                disabled={isResetting}>
                                <Shield className="h-4 w-4" />
                              </Button>
                            )}
                            {canManage && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setResettingId(business.id)}
                                className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                disabled={isResetting}>
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            {!business.is_default && canManage && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeletingId(business.id)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={isResetting}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Business Dialog */}
      <NewBusinessDialog open={showNewDialog} onOpenChange={setShowNewDialog} />

      {/* Backup Dialog */}
      <BackupDialog
        open={showBackupDialog}
        onOpenChange={setShowBackupDialog}
      />

      {/* Restore Dialog */}
      <RestoreDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
      />

      {/* Reset Business Dialog */}
      <ResetBusinessDialog
        open={!!resettingId}
        onOpenChange={() => setResettingId(null)}
        onConfirm={handleReset}
        businessName={getResettingBusinessName()}
      />

      {/* Password Dialog */}
      <BusinessPasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        businessName={passwordPromptData?.businessName || ""}
        onPasswordVerified={handlePasswordVerified}
        onVerifyPassword={async (password) => {
          if (passwordPromptData) {
            return await verifyBusinessPassword(
              passwordPromptData.businessId,
              password,
            );
          }
          return false;
        }}
      />

      {/* Password Manager Dialog */}
      {managingPasswordBusinessId && (
        <BusinessPasswordManager
          open={showPasswordManager}
          onOpenChange={setShowPasswordManager}
          businessId={managingPasswordBusinessId}
          businessName={
            businessLocations.find((b) => b.id === managingPasswordBusinessId)
              ?.name || ""
          }
          hasPassword={
            !!businessLocations.find((b) => b.id === managingPasswordBusinessId)
              ?.switch_password_hash
          }
          onPasswordSet={handlePasswordSet}
          onSetPassword={setBusinessPassword}
          onRemovePassword={async (
            businessId: string,
            currentPassword: string,
          ) => {
            // First verify the password
            const isVerified = await verifyBusinessPassword(
              businessId,
              currentPassword,
            );
            if (isVerified) {
              return await removeBusinessPassword(businessId);
            }
            return false;
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent className="mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete this business? This action cannot
              be undone and will permanently delete all associated data
              including products, sales, customers, and expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse md:flex-row gap-2">
            <AlertDialogCancel className="w-full md:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="w-full md:w-auto bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Location Limit Dialog - Using AlertDialog for better visibility */}
      <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <AlertDialogContent className="mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <Shield className="h-5 w-5" />
              Location Limit Reached
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm pt-2" asChild>
              <div className="space-y-4">
                <p className="font-medium text-foreground">
                  You have reached the maximum allowed limit of{" "}
                  <span className="font-bold text-amber-600">
                    {locationLimit} locations
                  </span>
                  .
                </p>
                <div className="bg-muted/50 p-4 rounded-lg border border-border/50 text-sm space-y-2">
                  <p>To add more locations, please contact Admin support:</p>
                  <a
                    href="tel:+256758519696"
                    className="block text-primary font-bold text-lg hover:underline">
                    +256 758519696
                  </a>
                  <p className="text-xs text-muted-foreground italic">
                    Note: Additional charges may apply for increasing your
                    location limit.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="w-full">Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BusinessManagement;
