import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import "@/app/(agency)/agency/globals.css";
import { Providers } from "@/components/Providers";
import { getInitialAppDataAction } from "@/app/actions/app-init";

export const metadata: Metadata = {
  title: "Gonza Systems",
  description: "Sales and Inventory Tracking Application",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const result = await getInitialAppDataAction();
  const initialData = result.success ? result.data : null;

  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"
        />
      </head>
      <body>
        <Providers
          initialSession={initialData?.session || null}
          initialBusinessLocations={initialData?.locations || []}
          initialProfiles={initialData?.profiles || []}
          initialAccountStatus={initialData?.accountStatus || null}
          initialBusinessSettings={initialData?.businessSettings || null}
          initialAnalyticsSummary={initialData?.analyticsSummary || null}
          isUnauthorized={initialData?.isUnauthorized || false}
        >
          {children}
          <Toaster />
          <Sonner />
        </Providers>
      </body>
    </html>
  );
}
