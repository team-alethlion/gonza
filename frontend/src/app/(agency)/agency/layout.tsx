/* eslint-disable @typescript-eslint/no-explicit-any */
import AgencyLayout from "@/components/AgencyLayout";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { enforceStrictAccess } from "@/lib/strict-guard";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { getProfilesAction } from "@/app/actions/profiles";

export default async function AgencyLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session || !session.user) {
    redirect("/public/login");
  }

  const userId = session.user.id;
  const branchId = (session.user as any).branchId;

  // SUPER STRICT GUARD: Returns notFound() if status is invalid
  // This prevents the layout from rendering if the user isn't active.
  await enforceStrictAccess();

  // 🚀 PERMISSION CONTROL CENTER: Fetch profiles once for the entire layout
  let initialProfiles = [];
  if (branchId) {
    try {
      const profiles: any = await getProfilesAction(branchId);
      initialProfiles = profiles || [];
    } catch (error) {
      console.error("Failed to prefetch profiles in root layout:", error);
    }
  }

  return (
    <ProfileProvider initialProfiles={initialProfiles}>
      <AgencyLayout>{children}</AgencyLayout>
    </ProfileProvider>
  );
}
