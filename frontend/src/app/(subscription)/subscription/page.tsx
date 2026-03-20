/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Crown, Shield, LogOut, Clock, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import Logo from "@/components/header/Logo";
import Link from "next/link";

export default function SubscriptionPage() {
  const { subscription, packages, isLoading, activateTrial, upgradeSubscription } = useSubscription();
  const { signOut } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 space-y-8">
        <div className="text-center space-y-4">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[500px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const currentPackageId = subscription?.package?.id || subscription?.package;
  const subStatus = subscription?.subscription_status || subscription?.subscriptionStatus;
  const isTrial = subStatus === "trial";
  const isActive = subStatus === "active";
  const hasHadTrial = subscription?.had_trial_before || subscription?.hadHadTrial;

  const getStatusBadge = () => {
    if (isTrial) return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Free Trial</Badge>;
    if (isActive) return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Active</Badge>;
    return <Badge variant="destructive">Expired</Badge>;
  };

  const getExpiryDate = () => {
    const date = subscription?.subscription_expiry || subscription?.subscriptionExpiry || subscription?.trial_end_date || subscription?.trialEndDate;
    if (!date) return null;
    return format(new Date(date), "PPP");
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="h-6 w-px bg-gray-200 hidden sm:block" />
            <span className="font-bold text-xl tracking-tight hidden sm:block">Subscription</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Current Status Section */}
        {subscription && (
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="border-primary/10 shadow-sm overflow-hidden">
              <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-sm uppercase tracking-wider text-primary/80">Your Current Plan</span>
                </div>
                {getStatusBadge()}
              </div>
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold">{subscription.package?.name || "No Plan Selected"}</h2>
                    <p className="text-muted-foreground">{subscription.package?.description || "Select a plan below to get started with Gonza Systems."}</p>
                  </div>
                  {getExpiryDate() && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-4 bg-white border rounded-xl p-4 shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valid Until</p>
                          <p className="font-semibold text-sm">{getExpiryDate()}</p>
                        </div>
                      </div>
                      
                      {(isTrial || isActive) && (
                        <Button asChild className="w-full shadow-md hover:shadow-lg transition-all">
                          <Link href="/agency" className="flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs">
                            Enter Dashboard
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pricing Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Ready to scale your business?</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your needs. Upgrade or cancel at any time.
          </p>

          <div className="flex justify-center pt-4">
            <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as any)} className="w-auto">
              <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-gray-100/80">
                <TabsTrigger value="monthly" className="rounded-md px-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">Monthly</TabsTrigger>
                <TabsTrigger value="yearly" className="rounded-md px-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Yearly
                  <Badge className="ml-2 bg-emerald-500 hover:bg-emerald-500 text-[10px] h-4 px-1.5 border-none">-20%</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {packages?.map((pkg: any) => {
            const isCurrent = currentPackageId === pkg.id;
            const price = billingCycle === "monthly" ? Number(pkg.monthlyPrice) : Number(pkg.yearlyPrice);
            const features = pkg.features ? (pkg.features as any).list || [] : [];

            return (
              <Card key={pkg.id} className={`relative flex flex-col border-2 transition-all duration-300 ${isCurrent ? 'border-primary shadow-xl scale-[1.02] z-10' : 'border-transparent shadow-md hover:shadow-lg hover:border-primary/20'}`}>
                {pkg.name === "Professional" && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                    Most Popular
                  </div>
                )}
                
                <CardHeader className="p-8 pb-0">
                  <CardTitle className="text-xl font-bold">{pkg.name}</CardTitle>
                  <CardDescription className="min-h-[40px] mt-2">{pkg.description}</CardDescription>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tight">UGX {price.toLocaleString()}</span>
                    <span className="text-muted-foreground font-medium">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                </CardHeader>

                <CardContent className="p-8 flex-1">
                  <div className="space-y-4">
                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">What&apos;s included:</p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-sm">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span>Up to <strong>{pkg.maxUsers} Users</strong></span>
                      </li>
                      <li className="flex items-start gap-3 text-sm">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span>Up to <strong>{pkg.maxProducts} Products</strong></span>
                      </li>
                      <li className="flex items-start gap-3 text-sm">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span>Up to <strong>{pkg.maxSalesPerMonth} Sales/mo</strong></span>
                      </li>
                      {features.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                          <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter className="p-8 pt-0 flex flex-col gap-3">
                  <Button 
                    className="w-full h-12 font-bold text-sm uppercase tracking-wider shadow-lg transition-all active:scale-[0.98]" 
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent && isActive}
                    onClick={() => upgradeSubscription.mutate({ packageId: pkg.id, duration: billingCycle })}
                  >
                    {isCurrent && isActive ? "Current Plan" : "Upgrade Now"}
                  </Button>

                  {pkg.hasFreeTrial && !hasHadTrial && !isCurrent && (
                    <Button 
                      variant="ghost" 
                      className="w-full text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => activateTrial.mutate(pkg.id)}
                      disabled={activateTrial.isPending}
                    >
                      {activateTrial.isPending ? "Activating..." : `Start ${pkg.trialDays}-day Free Trial`}
                    </Button>
                  )}
                  
                  {pkg.hasFreeTrial && hasHadTrial && !isTrial && (
                    <p className="text-[10px] text-center text-muted-foreground/60 font-medium italic mt-1">Trial previously used for this agency</p>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Security Trust */}
        <div className="mt-20 flex flex-col items-center gap-6">
          <div className="flex items-center gap-8 opacity-40 grayscale filter">
            {/* Logos could go here */}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <Shield className="w-4 h-4" />
            Secure 256-bit SSL Encrypted Payments
          </div>
        </div>
      </main>
    </div>
  );
}
