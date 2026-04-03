/* eslint-disable @typescript-eslint/no-explicit-any */
import AgencyLayout from "@/components/AgencyLayout";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { enforceStrictAccess } from "@/lib/strict-guard";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { getProfilesAction } from "@/app/actions/profiles";
import { SyncManager } from "@/components/SyncManager";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { getInitialAppDataAction } from "@/app/actions/app-init";

export default async function AgencyLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getInitialAppDataAction();
  const initialData = result.success ? result.data : null;

  if (initialData?.isUnauthorized) {
    redirect("/public/login");
  }

  const session = initialData?.session;

  if (!session || !session.user) {
    redirect("/public/login");
  }

  const branchId =
    initialData?.currentBranchId || (session.user as any).branchId;

  // SUPER STRICT GUARD: Returns notFound() if status is invalid
  // This prevents the layout from rendering if the user isn't active.
  await enforceStrictAccess(session);

  // 🚀 PERMISSION CONTROL CENTER: Fetch profiles once for the entire layout
  let initialProfiles = [];
  if (branchId) {
    try {
      const profiles: any = await getProfilesAction(branchId, session);
      initialProfiles = profiles || [];
    } catch (error) {
      console.error("Failed to prefetch profiles in agency layout:", error);
    }
  }

  return (
    <BusinessProvider
      initialLocations={initialData?.locations || []}
      initialAccountStatus={initialData?.accountStatus || null}
      initialBusinessSettings={initialData?.businessSettings || null}
      initialAnalyticsSummary={initialData?.analyticsSummary || null}>
      <ProfileProvider initialProfiles={initialProfiles}>
        <SyncManager />
        <AgencyLayout>{children}</AgencyLayout>
      </ProfileProvider>
    </BusinessProvider>
  );
}
