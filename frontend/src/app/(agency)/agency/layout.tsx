/* eslint-disable @typescript-eslint/no-explicit-any */
import AgencyLayout from "@/components/AgencyLayout";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { enforceStrictAccess } from "@/lib/strict-guard";

export default async function AgencyLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session || !session.user) {
    redirect("/public/login");
  }

  // SUPER STRICT GUARD: Returns notFound() if status is invalid
  // This prevents the layout from rendering if the user isn't active.
  await enforceStrictAccess();

  return <AgencyLayout>{children}</AgencyLayout>;
}
