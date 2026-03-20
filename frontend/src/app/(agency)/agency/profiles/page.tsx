"use client";

import React, { useState } from "react";
import { ProfileContent } from "@/components/profiles/ProfileContent";
import { ProfileHeader } from "@/components/profiles/ProfileHeader";
import { NewProfileDialog } from "@/components/profiles/NewProfileDialog";
import { EditProfileDialog } from "@/components/profiles/EditProfileDialog";
import { DeleteProfileDialog } from "@/components/profiles/DeleteProfileDialog";
import { useProfiles, BusinessProfile } from "@/contexts/ProfileContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleManagement } from "@/components/profiles/RoleManagement";
import { SecuritySettings } from "@/components/profiles/SecuritySettings";
import { Users, Shield, Lock } from "lucide-react";

const Profiles = () => {
  const { currentBusiness } = useBusiness();
  const { profiles, isLoading, hasPermission } = useProfiles();
  const canManage = hasPermission("profiles", "manage");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BusinessProfile | null>(
    null,
  );
  const [deletingProfile, setDeletingProfile] =
    useState<BusinessProfile | null>(null);

  if (!currentBusiness) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">
            No Business Selected
          </h2>
          <p className="text-muted-foreground">
            Please select a business to manage profiles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Tabs defaultValue="profiles" className="w-full">
        <div className="flex items-center justify-between mb-4 border-b pb-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="profiles" className="gap-2">
              <Users className="h-4 w-4" />
              Profiles
            </TabsTrigger>
            {hasPermission("profiles", "manage") && (
              <TabsTrigger value="roles" className="gap-2">
                <Shield className="h-4 w-4" />
                Roles
              </TabsTrigger>
            )}
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <div className="hidden sm:block">
            <p className="text-sm text-muted-foreground">
              Current Business:{" "}
              <span className="font-semibold text-foreground">
                {currentBusiness.name}
              </span>
            </p>
          </div>
        </div>

        <TabsContent value="profiles" className="space-y-6 mt-0">
          <ProfileHeader
            profilesCount={profiles.length}
            onNewProfile={() => setShowNewDialog(true)}
            canManage={canManage}
          />

          <ProfileContent
            profiles={profiles}
            isLoading={isLoading}
            onEditProfile={setEditingProfile}
            onDeleteProfile={setDeletingProfile}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="roles" className="mt-0">
          <RoleManagement />
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          <SecuritySettings />
        </TabsContent>
      </Tabs>

      <NewProfileDialog open={showNewDialog} onOpenChange={setShowNewDialog} />

      <EditProfileDialog
        profile={editingProfile}
        open={!!editingProfile}
        onOpenChange={(open) => !open && setEditingProfile(null)}
      />

      <DeleteProfileDialog
        profile={deletingProfile}
        open={!!deletingProfile}
        onOpenChange={(open) => !open && setDeletingProfile(null)}
      />
    </div>
  );
};

export default Profiles;
