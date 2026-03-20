"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { SessionProvider, signOut } from "next-auth/react";
import { SyncManager } from "./SyncManager";

export function Providers({ 
    children, 
    initialSession = null,
    initialBusinessLocations = [],
    initialProfiles = [],
    initialAccountStatus = null,
    initialBusinessSettings = null,
    initialAnalyticsSummary = null,
    isUnauthorized = false
}: { 
    children: React.ReactNode,
    initialSession?: any,
    initialBusinessLocations?: any[],
    initialProfiles?: any[],
    initialAccountStatus?: any,
    initialBusinessSettings?: any,
    initialAnalyticsSummary?: any,
    isUnauthorized?: boolean
}) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: 1, // Retry failed queries once
                        staleTime: 5 * 60_000, // 5 minutes - data stays fresh
                        gcTime: 30 * 60_000, // 30 minutes - cache persists
                        refetchOnWindowFocus: false, // Prevent refetching on window focus
                    },
                },
            })
    );

    useEffect(() => {
        if (isUnauthorized) {
            console.warn("[Providers] 401 Detected from server. Killing orphaned session on client.");
            signOut({ redirect: true, callbackUrl: '/public/login' });
        }
    }, [isUnauthorized]);

    return (
        <SessionProvider session={initialSession}>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <BusinessProvider 
                        initialLocations={initialBusinessLocations}
                        initialAccountStatus={initialAccountStatus}
                    >
                        <ProfileProvider initialProfiles={initialProfiles}>
                            <SyncManager />
                            {children}
                        </ProfileProvider>
                    </BusinessProvider>
                </AuthProvider>
            </QueryClientProvider>
        </SessionProvider>
    );
}
