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
import ReauthenticateNotice from "@/components/auth/ReauthenticateNotice";

export default async function AgencyLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/public/login");
  }

  try {
    // 🛡️ RECOVERY PARADOX GUARD: 
    // If tokens are dead but the account is recovered (Active), 
    // throw an error to trigger the error boundary with a recovery path.
    const isTokenDead = (session as any)?.authError === "RefreshAccessTokenError";
    const userStatus = (session?.user as any)?.status;
    const subStatus = (session?.user as any)?.subscriptionStatus;

    if (isTokenDead && (userStatus === 'ACTIVE' || subStatus === 'active')) {
      console.log(`[AgencyLayout] Recovery Paradox Detected: User is Active but Token is Dead. Triggering Reauthentication Error.`);
      throw new Error("REAUTHENTICATION_REQUIRED");
    }

    // 1. SUPER STRICT GUARD: Validates subscription and onboarding
    // This is now the source of truth for access.
    await enforceStrictAccess(session);

    // 2. DATA HYDRATION: Fetch shell data now that we know the user is valid
    const result = await getInitialAppDataAction();
    const initialData = result.success ? result.data : null;

    if (initialData?.isUnauthorized) {
      console.log("[AgencyLayout] Session is unauthorized. Triggering error boundary.");
      throw new Error("UNAUTHORIZED");
    }

    const branchId =
      initialData?.currentBranchId || (session.user as any).branchId;

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
  } catch (error: any) {
    // 🛡️ IMPORTANT: Rethrow Next.js internal redirect errors so they aren't caught as failures
    if (error.digest?.includes("NEXT_REDIRECT")) {
      throw error;
    }

    // Normalized errors for the error.tsx boundary
    if (error.message === "REAUTHENTICATION_REQUIRED" || error.message === "UNAUTHORIZED") {
      throw error;
    }

    console.error("[AgencyLayout] Critical Failure:", error.message || error);
    throw error;
  }

}
