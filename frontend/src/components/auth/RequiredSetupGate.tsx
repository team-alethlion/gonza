"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useBusiness } from '@/contexts/BusinessContext';
import { useProfiles } from '@/contexts/ProfileContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';
import { useOnboarding } from '@/hooks/useOnboarding';

interface RequiredSetupGateProps {
    children: React.ReactNode;
}

export const RequiredSetupGate: React.FC<RequiredSetupGateProps> = ({ children }) => {
    const { businessLocations, currentBusiness, isLoading: businessLoading, createBusiness } = useBusiness();
    const { profiles, isLoading: profilesLoading } = useProfiles();
    const { isCompleted: onboardingCompleted, isFrozen, daysRemaining, isLoading: onboardingLoading } = useOnboarding(currentBusiness?.id);
    const { user, loading: authLoading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isAutomating, setIsAutomating] = useState(false);

    // LOG EVERY RENDER
    console.log('[Gate Render Check]:', {
        path: pathname,
        user: user?.id,
        authLoading,
        businessLoading,
        profilesLoading,
        onboardingLoading,
        onboardingCompleted,
        isAutomating,
        locationsCount: businessLocations.length,
        profilesCount: profiles.length,
        isSetupIncomplete: !businessLoading && !profilesLoading && (businessLocations.length === 0 || profiles.length === 0)
    });

    const isSetupIncomplete = !businessLoading && !profilesLoading && (businessLocations.length === 0 || profiles.length === 0);

    // Auto-create business if none exists
    useEffect(() => {
        const performAutoSetup = async () => {
            if (!businessLoading && !profilesLoading && user && businessLocations.length === 0 && !isAutomating) {
                console.log('[Gate Action]: Auto-creating business for user:', user.id);
                setIsAutomating(true);
                try {
                    const businessName = (user as any).user_metadata?.business_name || 'My Business';
                    await createBusiness(businessName);
                    toast.success('Your business system is ready!');
                } catch (error) {
                    console.error('[Gate Error]: Auto-setup failed:', error);
                    toast.error('Failed to complete account setup. Please try again.');
                } finally {
                    setIsAutomating(false);
                }
            }
        };

        performAutoSetup();
    }, [businessLoading, profilesLoading, businessLocations.length, user, isAutomating, createBusiness]);

    // Redirect logic
    useEffect(() => {
        if (!authLoading && !businessLoading && !onboardingLoading && onboardingCompleted === false) {
            if (pathname !== '/onboarding') {
                console.log('[Gate Action]: MANDATORY REDIRECT to /onboarding');
                router.replace('/onboarding');
            }
        }
    }, [authLoading, businessLoading, onboardingLoading, onboardingCompleted, pathname, router]);


    // Primary Loading states
    if (authLoading || businessLoading || profilesLoading || onboardingLoading || isAutomating) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
                <LoadingSpinner message={
                    isAutomating ? "Finalizing account setup..." :
                        onboardingLoading ? "Checking profile status..." :
                            "Checking account setup..."
                } />
            </div>
        );
    }

    // Wait for business setup to finish
    if (isSetupIncomplete) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <LoadingSpinner message="Finalizing setup..." />
            </div>
        );
    }

    // STRICT CHECK: If not completed and not on onboarding page, return null (waiting for redirect effect)
    if (onboardingCompleted === false && pathname !== '/onboarding') {
        console.log('[Gate Status]: Blocking render, awaiting redirect to onboarding');
        return null;
    }

    // MANDATORY FREEZE CHECK (Only after onboarding is complete)
    // This allows new users to complete onboarding even if their trial is technically 0 (though defaults should prevent this)
    if (onboardingCompleted && isFrozen) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
                <div className="w-full max-w-md bg-white border border-border/40 shadow-xl rounded-lg p-10 text-center animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 border-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 border">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    <h2 className="text-xl font-bold text-foreground mb-3 uppercase tracking-widest">
                        Account Paused
                    </h2>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                        Your account has been temporarily paused due to unusual activity detected on your profile. Please contact the administrator immediately to resolve this issue and restore your access.
                    </p>

                    <div className="space-y-3">
                        <div className="bg-muted/30 p-3 rounded-lg border border-border/40 mb-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Admin Support</p>
                            <a
                                href="tel:+256758519696"
                                className="text-lg font-bold text-primary hover:underline block"
                            >
                                +256 758519696
                            </a>
                        </div>

                        <button
                            onClick={() => signOut()}
                            className="block w-full py-2.5 text-muted-foreground text-[10px] font-bold uppercase tracking-widest border border-border/40 rounded hover:bg-muted transition-all"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // FINAL PASS: Only let through if setup is complete AND onboarding is complete
    if (onboardingCompleted === true || pathname === '/onboarding') {
        console.log('[Gate Status]: ALLOWING PASSAGE to', pathname);
        return <>{children}</>;
    }

    // Default: block while transitioning or if state is ambiguous
    console.log('[Gate Status]: Fallback block');
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <LoadingSpinner message="Verifying access..." />
        </div>
    );
};
