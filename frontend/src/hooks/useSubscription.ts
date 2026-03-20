"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAgencySubscriptionAction, activateTrialAction, upgradeSubscriptionAction } from "@/app/actions/subscriptions";
import { getPackagesAction } from "@/app/actions/packages";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";

export const useSubscription = () => {
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
          await updateSession({
            refreshFromDb: true // Force JWT callback to re-fetch from Django
          });
        }
        queryClient.invalidateQueries({ queryKey: ["agency-subscription"] });
        // Redirect to agency (middleware will handle onboarding check if needed)
        setTimeout(() => {
          window.location.href = "/agency";
        }, 1000);
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
          await updateSession({
            subscriptionStatus: "active",
            subscriptionExpiry: subResult.data.subscriptionExpiry,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["agency-subscription"] });
        // Redirect to agency (middleware will handle onboarding check if needed)
        setTimeout(() => {
          window.location.href = "/agency";
        }, 1500);
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
