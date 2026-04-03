import React from "react";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { getInitialAppDataAction } from "@/app/actions/app-init";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getInitialAppDataAction();
  const initialData = result.success ? result.data : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <BusinessProvider
        initialLocations={initialData?.locations || []}
        initialAccountStatus={initialData?.accountStatus || null}
        initialBusinessSettings={initialData?.businessSettings || null}
        initialAnalyticsSummary={initialData?.analyticsSummary || null}
      >
        {children}
      </BusinessProvider>
    </div>
  );
}
