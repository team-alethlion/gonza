"use client"

import React from 'react';
import { useProfiles, BusinessProfile } from '@/contexts/ProfileContext';
import { User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const ProfileSelectionOverlay: React.FC = () => {
    const { profiles, currentProfile, setCurrentProfile, logoutProfile, isLoading } = useProfiles();

    if (currentProfile || isLoading || profiles.length === 0) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center overflow-y-auto p-4 sm:p-8">
            <div className="w-full max-w-2xl space-y-12 animate-in fade-in zoom-in duration-500 py-12">
                <div className="text-center space-y-8">
                    <div className="flex justify-center mb-4">
                        <img
                            src="/icon.png"
                            alt="Gonza Logo"
                            className="h-24 md:h-32 animate-in fade-in slide-in-from-bottom-8 duration-1000"
                        />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-4xl font-extrabold tracking-tight text-primary">Welcome Back</h1>
                        <p className="text-muted-foreground text-xl">Please select your profile to continue</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profiles.map((profile) => (
                        <Card
                            key={profile.id}
                            className="cursor-pointer hover:border-primary hover:shadow-lg transition-all transform hover:-translate-y-1 group"
                            onClick={() => setCurrentProfile(profile)}
                        >
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                    <User className="h-6 w-6 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <CardTitle className="text-lg truncate">{profile.profile_name}</CardTitle>
                                    <CardDescription className="capitalize">{profile.role}</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-center pt-8">
                    <Button
                        variant="ghost"
                        className="text-muted-foreground hover:text-primary gap-2"
                        onClick={logoutProfile}
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out of business
                    </Button>
                </div>
            </div>
        </div>
    );
};
