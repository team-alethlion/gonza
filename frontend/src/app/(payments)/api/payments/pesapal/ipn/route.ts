/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import {
  verifyPesapalTransaction,
  processSuccessfulSubscription,
} from "@/lib/pesapal";

/**
 * Pesapal IPN Handler
 * This is called by Pesapal whenever a transaction status changes.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { OrderTrackingId, MerchantReference } = body;

    if (!OrderTrackingId || !MerchantReference) {
      return NextResponse.json(
        { error: "Missing tracking ID or reference" },
        { status: 400 },
      );
    }

    // 1. Verify transaction status directly with Pesapal
    const statusData = await verifyPesapalTransaction(OrderTrackingId);

    // 2. Process based on status (Pesapal status '1' usually means Success)
    if (statusData.status_code === 1) {
      const result = await processSuccessfulSubscription(
        MerchantReference,
        statusData,
      );
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    // Pesapal expects a specific response to acknowledge the IPN
    return NextResponse.json({
      status: 200,
      order_tracking_id: OrderTrackingId,
      merchant_reference: MerchantReference,
    });
  } catch (error: any) {
    console.error("Pesapal IPN Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
