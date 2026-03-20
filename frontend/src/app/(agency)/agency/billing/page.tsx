/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useQuery } from '@tanstack/react-query';
import { getSubscriptionTransactionsAction, initiateSubscriptionPaymentAction } from '@/app/actions/billing';
import { getPackagesAction } from '@/app/actions/packages';
import {
    CreditCard,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    Download,
    Receipt,
    Building2,
    ChevronRight,
    FileText,
    History as HistoryIcon,
    Sparkles,
    Check,
    ArrowRightLeft,
    Box,
    Loader2,
    Users as UsersIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { generateSubscriptionInvoice } from '@/utils/generateSubscriptionInvoice';
import LoadingSpinner from '@/components/LoadingSpinner';

interface SubscriptionPayment {
    id: string;
    created_at: string;
    billing_cycle: string | null;
    amount: number;
    payment_status: string | null;
}

const BillingHistory = () => {
    const { user } = useAuth();
    const { currentBusiness } = useBusiness();
    const [isInitiatingPayment, setIsInitiatingPayment] = React.useState(false);
    const [pesapalRedirectUrl, setPesapalRedirectUrl] = React.useState<string | null>(null);

    const {
        daysRemaining,
        billingAmount,
        billingDuration,
        nextBillingDate,
        packageId: currentPackageId,
        isFrozen,
        isLoading: isSubscriptionLoading,
        refetch: refetchOnboarding
    } = useOnboarding(currentBusiness?.id);

    const { data: rawPayments, isLoading: isPaymentsLoading } = useQuery({
        queryKey: ['subscription-payments', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const data = await getSubscriptionTransactionsAction(user.id);
            return data as SubscriptionPayment[];
        },
        enabled: !!user
    });

    const { data: packages, isLoading: isPackagesLoading } = useQuery({
        queryKey: ['billing-packages'],
        queryFn: async () => {
            const result = await getPackagesAction();
            if (!result.success) throw new Error(result.error);
            return result.data || [];
        }
    });

    const payments = React.useMemo(() => {
        if (!rawPayments) return [];
        return rawPayments.map((p, index) => ({
            ...p,
            invoice_number: index + 1,
            business_name: currentBusiness?.name || 'Gonzo System User'
        })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [rawPayments, currentBusiness]);

    const getStatusColor = (days: number, frozen: boolean) => {
        if (frozen || days <= 0) return 'text-red-600 bg-red-50 border-red-100';
        if (days <= 7) return 'text-amber-600 bg-amber-50 border-amber-100';
        return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    };

    const getStatusText = (days: number, frozen: boolean) => {
        if (frozen) return 'Account Paused';
        if (days <= 0) return 'Expired';
        if (days <= 7) return 'Expiring Soon';
        return 'Active';
    };

    const handleDownloadInvoice = async (payment: any, type: 'receipt' | 'invoice' = 'invoice') => {
        await generateSubscriptionInvoice(payment, type);
    };

    const handleRenew = async (targetPackageId?: string) => {
        if (!user) return;

        setIsInitiatingPayment(true);
        try {
            const locationId = currentBusiness?.id || (user as any).location_id || '00000000-0000-0000-0000-000000000000';
            const phone = (user as any).user_metadata?.phone || (user as any).phone || '0700000000';

            const result = await initiateSubscriptionPaymentAction(
                user.id,
                locationId,
                billingDuration || 'monthly',
                phone,
                targetPackageId
            );

            if (!result.success) {
                throw new Error(result.error);
            }

            if (result.redirect_url) {
                setPesapalRedirectUrl(result.redirect_url);
            }
        } catch (error: any) {
            console.error('Subscription Renewal Error:', error);
            const errorMsg = error.message || error.error || "Failed to connect to Pesapal.";
            alert(`Payment Error: ${errorMsg}. Please try again later.`);
        } finally {
            setIsInitiatingPayment(false);
        }
    };

    const handleDownloadUpcomingInvoice = async () => {
        if (!nextBillingDate || !billingAmount) return;

        const upcomingPayment = {
            id: `PRO-FORMA-${format(new Date(), 'yyyyMMdd')}`,
            created_at: new Date().toISOString(),
            due_date: nextBillingDate,
            amount: billingAmount,
            billing_cycle: billingDuration || 'Monthly',
            payment_status: 'pending',
            user_id: user?.id,
            isProForma: true,
            business_name: currentBusiness?.name || 'Gonzo System User',
            invoice_number: (payments?.length || 0) + 1
        };

        await generateSubscriptionInvoice(upcomingPayment, 'invoice');
    };

    if (isSubscriptionLoading || isPaymentsLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <LoadingSpinner message="Loading billing data..." />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {pesapalRedirectUrl && (
                <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl border border-border/40 overflow-hidden relative flex flex-col scale-in-center">
                        <div className="p-4 border-b border-border/40 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <CreditCard className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider">Secure Payment</h3>
                                    <p className="text-[10px] text-muted-foreground font-mono italic">Powered by Pesapal</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setPesapalRedirectUrl(null);
                                    refetchOnboarding();
                                }}
                                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                                Close & Sync
                            </button>
                        </div>
                        <iframe
                            src={pesapalRedirectUrl}
                            className="w-full flex-1 border-none"
                            title="Pesapal Payment"
                        />
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Billing & Subscription</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Manage your plan, track payments, and download invoices.</p>
                </div>
                <div className="flex items-center flex-wrap gap-3">
                    <button
                        onClick={() => handleRenew()}
                        disabled={isInitiatingPayment}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
                    >
                        {isInitiatingPayment ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <CreditCard className="w-4 h-4" />
                        )}
                        Renew / Pay Now
                    </button>
                    <button
                        onClick={handleDownloadUpcomingInvoice}
                        className="px-4 py-2.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Upcoming Invoice
                    </button>
                    <div className={cn(
                        "px-4 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 w-fit",
                        getStatusColor(daysRemaining, isFrozen)
                    )}>
                        {isFrozen || daysRemaining <= 0 ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {getStatusText(daysRemaining, isFrozen)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-border/40 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Receipt className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Plan</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold">UGX {billingAmount?.toLocaleString()}</h3>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{billingDuration}</p>
                    </div>
                </div>

                <div className="bg-white border border-border/40 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Days Remaining</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className={cn("text-2xl font-bold", daysRemaining <= 7 ? "text-orange-600" : "text-foreground")}>
                            {daysRemaining <= 0 ? '0' : daysRemaining} Days
                        </h3>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Left on Subscription</p>
                    </div>
                </div>

                <div className="bg-white border border-border/40 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Next Billing</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold">
                            {nextBillingDate ? format(new Date(nextBillingDate), 'MMM dd, yyyy') : 'No Date Set'}
                        </h3>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Scheduled Renewal</p>
                    </div>
                </div>
            </div>

            {/* NEW: Available Plans Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Available Tiers</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isPackagesLoading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
                        ))
                    ) : packages?.map((pkg: any) => {
                        const isCurrent = pkg.id === currentPackageId;
                        return (
                            <div key={pkg.id} className={cn(
                                "bg-white border rounded-2xl p-6 relative transition-all group overflow-hidden shadow-sm",
                                isCurrent ? "border-blue-200 ring-4 ring-blue-50 shadow-xl" : "border-border/40 hover:border-slate-300 hover:shadow-md"
                            )}>
                                {isCurrent && (
                                    <div className="absolute top-0 right-0 px-4 py-1.5 bg-blue-600 text-white rounded-bl-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg">
                                        Active
                                    </div>
                                )}
                                
                                <div className="mb-6">
                                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{pkg.name}</h4>
                                    <div className="mt-2 flex items-baseline gap-1.5">
                                        <span className="text-2xl font-extrabold text-slate-900">UGX {pkg.monthlyPrice.toLocaleString()}</span>
                                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">/ Mo</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{pkg.description || 'Professional inventory and sales management tools.'}</p>
                                </div>

                                <div className="space-y-3 mb-8 pt-6 border-t border-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-md bg-slate-50 flex items-center justify-center">
                                        <UsersIcon className="w-3 h-3 text-slate-400" />
                                    </div>
                                    <span className="text-xs text-slate-600">{pkg.unlimitedUsers ? 'Unlimited' : `Up to ${pkg.maxUsers}`} Team Members</span>
                                </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-md bg-slate-50 flex items-center justify-center">
                                            <Box className="w-3 h-3 text-slate-400" />
                                        </div>
                                        <span className="text-xs text-slate-600">{pkg.unlimitedProducts ? 'Unlimited' : `Up to ${pkg.maxProducts}`} Products</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-blue-500" />
                                        </div>
                                        <span className="text-xs text-blue-600 font-medium">Standard Support Included</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleRenew(pkg.id)}
                                    disabled={isInitiatingPayment}
                                    className={cn(
                                        "w-full h-11 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border",
                                        isCurrent 
                                            ? "bg-slate-50 text-slate-400 border-slate-100 cursor-default" 
                                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 active:scale-[0.98]"
                                    )}
                                >
                                    {isCurrent ? (
                                        <><CheckCircle2 className="w-4 h-4" /> Your Plan</>
                                    ) : (
                                        <><ArrowRightLeft className="w-4 h-4" /> {pkg.monthlyPrice > (billingAmount || 0) ? 'Upgrade' : 'Switch Plan'}</>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white border border-border/40 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border/40 bg-muted/5 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <HistoryIcon className="w-4 h-4 text-muted-foreground" />
                        Payment History
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/10 h-12">
                                <th className="px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date</th>
                                <th className="px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description</th>
                                <th className="px-6 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount</th>
                                <th className="px-6 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                                <th className="px-6 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {payments && payments.length > 0 ? (
                                payments.map((payment) => (
                                    <tr key={payment.id} className="h-16 hover:bg-muted/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold">{format(new Date(payment.created_at), 'MMM dd, yyyy')}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono">{payment.id.split('-')[0].toUpperCase()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span className="text-[13px] font-medium text-foreground">
                                                    {payment.billing_cycle} Subscription Renewal
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-[13px] font-bold">UGX {payment.amount.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-tight border",
                                                    payment.payment_status === 'completed' || payment.payment_status === 'success'
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                        : payment.payment_status === 'pending'
                                                            ? "bg-amber-50 text-amber-600 border-amber-100"
                                                            : "bg-red-50 text-red-600 border-red-100"
                                                )}>
                                                    {payment.payment_status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleDownloadInvoice(payment, 'invoice')}
                                                    className="p-2 hover:bg-primary/5 rounded-lg text-primary transition-colors inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">Invoice</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadInvoice(payment, 'receipt')}
                                                    className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">Receipt</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center">
                                                <Receipt className="w-6 h-6 text-muted-foreground/30" />
                                            </div>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No transaction history found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BillingHistory;
