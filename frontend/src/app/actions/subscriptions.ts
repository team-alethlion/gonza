"use server";

import { revalidatePath } from "next/cache";
import { addDays, format } from "date-fns";
import { sendSubscriptionNotificationEmail } from "@/lib/email";
import { initiatePesapalPayment } from "@/lib/pesapal";
import { verifyAgencyAccess, verifyUserAccess } from "@/lib/auth-guard";
import { djangoFetch } from "@/lib/django-client";

export async function getAgencySubscriptionAction() {
  try {
    const session = await import("@/auth").then(m => m.auth());
    const sessionUser = session?.user as any;
    
    // Robust extraction: handle both string IDs and nested objects
    const agencyId = sessionUser?.agencyId?.id || sessionUser?.agencyId;

    if (!agencyId) return { success: false, error: "No agency found" };

    await verifyAgencyAccess(agencyId);

    const agency = await djangoFetch(`core/agencies/${agencyId}/`);
    if (!agency || agency.error) return { success: false, error: "Agency not found" };

    if (agency.package) {
        // Robust extraction of package ID string
        const packageId = typeof agency.package === 'object' ? agency.package.id : agency.package;
        const pkg = await djangoFetch(`core/packages/${packageId}/`);
        if (pkg && !pkg.error) {
            agency.packageDetails = {
                ...pkg,
                monthlyPrice: Number(pkg.monthly_price || 0),
                yearlyPrice: Number(pkg.yearly_price || 0)
            };
        }
    }

    return { success: true, data: { ...agency, package: agency.packageDetails } };
  } catch (error: any) {
    console.error("Error fetching subscription:", error);
    
    // 🛡️ JWT FALLBACK: If we can't reach the backend (401/403), return the cached session data
    // This prevents the "Blind UI" problem where the user sees "No Plan Selected"
    if (error.message?.includes("401:") || error.message?.includes("403:")) {
      try {
        const session = await import("@/auth").then(m => m.auth());
        const user = session?.user as any;
        if (user) {
          console.log("[Subscriptions] Falling back to JWT session data due to 401/403");
          return { 
            success: true, 
            data: { 
              id: user.agencyId,
              subscription_status: user.subscriptionStatus,
              subscription_expiry: user.subscriptionExpiry,
              trial_end_date: user.trialEndDate,
              is_onboarded: user.isOnboarded,
              isStale: true // Flag to tell the UI this is cached data
            } 
          };
        }
      } catch (fallbackError) {
        console.error("[Subscriptions] Fallback also failed:", fallbackError);
      }
    }

    return { success: false, error: error.message };
  }
}

export async function activateTrialAction(packageId: string) {
  try {
    const sessionUser = await import("@/auth").then(m => m.auth()).then(s => s?.user as any);
    
    // Robust extraction: handle both string IDs and nested objects
    const agencyId = sessionUser?.agencyId?.id || sessionUser?.agencyId;

    if (!agencyId) return { success: false, error: "No agency found" };

    await verifyAgencyAccess(agencyId);

    const result = await djangoFetch(`core/agencies/${agencyId}/activate_trial/`, {
        method: 'POST',
        body: JSON.stringify({ packageId })
    });

    if (result && result.error) {
        return { success: false, error: result.error };
    }

    const pkg = await djangoFetch(`core/packages/${packageId}/`);

    // Send confirmation email
    if (sessionUser?.email && pkg && !pkg.error) {
      await sendSubscriptionNotificationEmail(sessionUser.email, {
        userName: sessionUser.name || "Subscriber",
        planName: pkg.name,
        status: "Free Trial",
        expiryDate: format(addDays(new Date(), pkg.trial_days || 14), "PPP"),
        price: "UGX 0 (Trial)",
        limits: {
          users: pkg.unlimited_users ? "Unlimited" : pkg.max_users.toString(),
          products: pkg.unlimited_products ? "Unlimited" : pkg.max_products.toString(),
          sales: pkg.unlimited_sales ? "Unlimited" : pkg.max_sales_per_month.toString()
        },
        isTrial: true
      });
    }

    revalidatePath("/subscription");
    return { success: true };
  } catch (error: any) {
    console.error("Error activating trial:", error);
    return { success: false, error: error.message };
  }
}

export async function upgradeSubscriptionAction(packageId: string, duration: "monthly" | "yearly") {
  try {
    const sessionUser = await import("@/auth").then(m => m.auth()).then(s => s?.user as any);
    const userId = sessionUser?.id;
    
    // Robust extraction: handle both string IDs and nested objects
    const agencyId = sessionUser?.agencyId?.id || sessionUser?.agencyId;
    
    if (!userId || !agencyId) return { success: false, error: "Authentication required" };

    await verifyUserAccess(userId);
    await verifyAgencyAccess(agencyId);

    const pkg = await djangoFetch(`core/packages/${packageId}/`);
    if (!pkg || pkg.error) return { success: false, error: "Package not found" };

    const price = duration === "monthly" ? Number(pkg.monthly_price) : Number(pkg.yearly_price);
    
    // 1. Create a unique reference for this transaction
    const reference = `SUB-${Date.now()}-${userId.substring(0, 8)}`;

    // 2. Create Transaction record in DB via Django API
    const purchaseId = crypto.randomUUID();
    await djangoFetch('core/subscriptions/', {
        method: 'POST',
        body: JSON.stringify({
            id: purchaseId,
            user: userId,
            agency: agencyId,
            package: packageId,
            amount: price,
            type: "subscription",
            billing_cycle: duration,
            status: "pending",
            pesapal_merchant_reference: reference,
            description: `Subscription upgrade to ${pkg.name} (${duration})`
        })
    });

    // 3. Initiate Pesapal Payment
    const pesapalResult = await initiatePesapalPayment({
      amount: price,
      email: sessionUser.email || "billing@gonzasystems.com",
      phoneNumber: sessionUser.phone || "0700000000",
      reference: reference,
      description: `Upgrade to ${pkg.name} (${duration})`,
      firstName: sessionUser.name?.split(' ')[0] || "Client",
      lastName: sessionUser.name?.split(' ').slice(1).join(' ') || "Admin"
    });

    if (!pesapalResult.redirect_url) {
      throw new Error("Failed to get redirect URL from Pesapal");
    }

    await djangoFetch(`core/subscriptions/${purchaseId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ pesapal_order_tracking_id: pesapalResult.order_tracking_id })
    });

    // 4. Return the redirect URL to the client
    return { 
      success: true, 
      redirectUrl: pesapalResult.redirect_url,
      merchantReference: reference
    };
  } catch (error: any) {
    console.error("Error upgrading subscription:", error);
    return { success: false, error: error.message };
  }
}
