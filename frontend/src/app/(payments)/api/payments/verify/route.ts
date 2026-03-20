/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import {
  verifyPesapalTransaction,
  processSuccessfulSubscription,
} from "@/lib/pesapal";

export async function POST(req: NextRequest) {
  try {
    const { orderTrackingId, purchaseId } = await req.json();

    if (!orderTrackingId) {
      return NextResponse.json(
        { success: false, error: "Missing tracking ID" },
        { status: 400 },
      );
    }

    // 1. Verify with Pesapal
    const statusData = await verifyPesapalTransaction(orderTrackingId);
    console.log("[VerifyPayment] Pesapal Status:", statusData);

    // 2. Determine reference (purchaseId or merchant_reference from statusData)
    const reference = purchaseId || statusData.merchant_reference;

    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Missing reference" },
        { status: 400 },
      );
    }

    // 3. Process if successful (status_code 1 is Success in Pesapal V3)
    let isCompleted = false;
    let valueAdded = 0;

    if (statusData.status_code === 1) {
      // processSuccessfulSubscription now reaches out to Django and returns value_added
      const result: any = await processSuccessfulSubscription(reference, statusData);
      if (result.success) {
        isCompleted = true;
        valueAdded = result.value_added || 30; 
      } else {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      payment_status: isCompleted
        ? "completed"
        : statusData.status_code === 2
        ? "failed"
        : "pending",
      tracking_id: orderTrackingId,
      merchant_reference: reference,
      value_added: valueAdded,
      is_subscription: true,
    });
  } catch (error: any) {
    console.error("[VerifyPayment API Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
