/* eslint-disable @typescript-eslint/no-explicit-any */
import { djangoFetch } from './django-client';

export async function verifyPesapalTransaction(trackingId: string) {
    const data = await djangoFetch(`finance/transactions/verify/?OrderTrackingId=${trackingId}`, {
        method: 'GET',
    });
    return data;
}

export async function initiatePesapalPayment(params: {
    amount: number;
    email: string;
    phoneNumber: string;
    reference: string;
    description: string;
    firstName?: string;
    lastName?: string;
    type?: string;
    agency_id?: string;
    package_id?: string;
    billing_cycle?: string;
}) {
    const data = await djangoFetch('finance/transactions/initiate_payment/', {
        method: 'POST',
        body: JSON.stringify({
            amount: params.amount,
            description: params.description,
            type: params.type || 'topup',
            agency_id: params.agency_id,
            package_id: params.package_id,
            billing_cycle: params.billing_cycle,
            // phone and email will be handled by backend from user object, 
            // but we can pass them if the backend supports manual overrides
        }),
    });

    return data;
}

// This is now purely a proxy for the backend process_success logic
export async function processSuccessfulSubscription(transactionId: string, pesapalData: any) {
    try {
        const data = await djangoFetch(`finance/transactions/${transactionId}/process_success/`, {
            method: 'POST',
            body: JSON.stringify({ amount: pesapalData.amount })
        });

        if (!data.success) {
            throw new Error(data.error || 'Unknown error processing transaction');
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error processing successful subscription via Django API:', error);
        return { success: false, error: error.message };
    }
}

// Deprecated: PesaPal token generation now happens on the backend
export async function getPesapalToken() {
    console.warn("getPesapalToken is deprecated on frontend. Use backend initiate_payment instead.");
    return null;
}
