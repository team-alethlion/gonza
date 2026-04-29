import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import "@/app/(agency)/agency/globals.css";
import { Providers } from "@/components/Providers";
import { auth } from "@/auth";
import AnimatePresenceWrapper from "@/components/AnimatePresenceWrapper";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gonza Systems",
  description: "Sales and Inventory Tracking Application",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"
        />
      </head>
      <body>
        <Providers
          initialSession={session || null}
          isUnauthorized={false}>
          <AnimatePresenceWrapper>
            {children}
          </AnimatePresenceWrapper>
          <Toaster />
          <Sonner />
        </Providers>
      </body>
    </html>
  );
}
