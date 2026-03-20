/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/utils";

/**
 * Pesapal Callback Handler (API)
 * This handles the GET request from Pesapal and redirects to our UI page.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trackingId = searchParams.get("OrderTrackingId");
  const merchantRef = searchParams.get("OrderMerchantReference");

  // Fallback if the user used the custom purchase_id param
  const purchaseId = searchParams.get("purchase_id");
  const ref = merchantRef || purchaseId;

  if (!trackingId || !ref) {
    return NextResponse.json(
      { error: "Missing required tracking parameters" },
      { status: 400 },
    );
  }

  try {
    const baseUrl = getBaseUrl();
    // Redirect to the UI page in the new payments route
    const redirectUrl = new URL("/payments/callback", baseUrl);

    redirectUrl.searchParams.set("OrderTrackingId", trackingId);
    redirectUrl.searchParams.set("purchase_id", ref);

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error: any) {
    console.error("Pesapal Callback Redirection Error:", error);
    return NextResponse.json({ error: "Redirection failed" }, { status: 500 });
  }
}
