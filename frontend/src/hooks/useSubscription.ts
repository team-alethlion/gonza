"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAgencySubscriptionAction, activateTrialAction, upgradeSubscriptionAction } from "@/app/actions/subscriptions";
import { getPackagesAction } from "@/app/actions/packages";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";

export const useSubscription = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { updateSession } = useAuth();

  const { data: subscription, isLoading: isSubscriptionLoading } = useQuery({
    queryKey: ["agency-subscription"],
    queryFn: async () => {
      const result = await getAgencySubscriptionAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });

  const { data: packages, isLoading: isPackagesLoading } = useQuery({
    queryKey: ["subscription-packages"],
    queryFn: async () => {
      const result = await getPackagesAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });

  const activateTrial = useMutation({
    mutationFn: activateTrialAction,
    onSuccess: async (data) => {
      if (data.success) {
        toast.success("Free trial activated successfully!");
        // Fetch fresh subscription data to get the new trialEndDate
        const subResult = await getAgencySubscriptionAction();
        
        if (subResult.success && subResult.data) {
          const freshData = subResult.data;
          const isActuallyOnboarded = freshData.is_onboarded || freshData.isOnboarded;
          const status = freshData.subscription_status || freshData.subscriptionStatus || "trial";
          
          // 🛡️ VERIFICATION CHECK: Only redirect if the backend confirms the trial is active
          const isVerified = status === "trial" || status === "active";

          await updateSession({
            subscriptionStatus: status,
            subscriptionExpiry: freshData.subscription_expiry || freshData.subscriptionExpiry,
            trialEndDate: freshData.trial_end_date || freshData.trialEndDate,
            isOnboarded: isActuallyOnboarded,
          });

          if (isVerified) {
            const targetPath = isActuallyOnboarded ? "/agency" : "/onboarding";
            console.log(`[Subscription] Verified. Redirecting to ${targetPath}`);
            
            setTimeout(() => {
              router.push(targetPath);
            }, 1000);
          }
        }
        queryClient.invalidateQueries({ queryKey: ["agency-subscription"] });
      } else {
        // Cleanly handle both string and object errors from Django
        const errorMsg = typeof data.error === 'string' 
          ? data.error 
          : (data.error?.detail || JSON.stringify(data.error));
        toast.error(errorMsg || "Failed to activate trial");
      }
    },
  });

  const upgradeSubscription = useMutation({
    mutationFn: ({ packageId, duration }: { packageId: string; duration: "monthly" | "yearly" }) =>
      upgradeSubscriptionAction(packageId, duration),
    onSuccess: async (data) => {
      if (data.success && data.redirectUrl) {
        toast.info("Redirecting to Pesapal for payment...");
        // Redirect the user to Pesapal
        window.location.href = data.redirectUrl;
      } else if (data.success) {
        toast.success("Subscription upgraded successfully!");
        const subResult = await getAgencySubscriptionAction();
        
        if (subResult.success && subResult.data) {
          const freshData = subResult.data;
          const isActuallyOnboarded = freshData.is_onboarded || freshData.isOnboarded;
          const status = freshData.subscription_status || freshData.subscriptionStatus || "active";
          
          const isVerified = status === "active" || status === "trial";

          await updateSession({
            subscriptionStatus: status,
            subscriptionExpiry: freshData.subscription_expiry || freshData.subscriptionExpiry,
            trialEndDate: freshData.trial_end_date || freshData.trialEndDate,
            isOnboarded: isActuallyOnboarded,
          });

          if (isVerified) {
            const targetPath = isActuallyOnboarded ? "/agency" : "/onboarding";
            console.log(`[Subscription] Upgraded and Verified. Redirecting to ${targetPath}`);
            
            setTimeout(() => {
              router.push(targetPath);
            }, 1500);
          }
        }
        queryClient.invalidateQueries({ queryKey: ["agency-subscription"] });
      } else {
        toast.error(data.error || "Failed to upgrade subscription");
      }
    },
  });

  return {
    subscription,
    packages,
    isLoading: isSubscriptionLoading || isPackagesLoading,
    activateTrial,
    upgradeSubscription,
  };
};
