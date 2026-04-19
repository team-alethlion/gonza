# Technical Audit: Legacy Environment Variable Usage

## 1. Executive Summary
This report provides a deep-dive technical analysis of how environment variables were invoked in the legacy `prev` project. By tracing the code-level implementations in Supabase Edge Functions and the React frontend, we have verified the exact drivers and API contracts required for 100% compatibility.

---

## 2. Eazireach Messaging (SMS)
### Implementation Logic: `supabase/functions/send-sms/index.ts`
-   **Endpoint**: `https://api.eazireach.com/api/v1/send`
-   **Authentication**: Uses custom headers instead of standard Bearer tokens.
    -   `X-API-Key`: Sourced from `EAZIREACH_API_KEY`.
    -   `X-Account-ID`: Sourced from `EAZIREACH_ACCOUNT_ID`.
-   **Request Body**:
    ```json
    {
      "recipients": [{ "phone": "..." }],
      "message": "...",
      "channel": ["sms"],
      "businessName": "..."
    }
    ```
-   **Strategic Improvement**: Our new `sms_gateway.py` has been updated to use this exact V1 protocol, ensuring your existing Eazireach credits are utilized correctly.

---

## 3. PesaPal V3 (Payments)
### Implementation Logic: `supabase/functions/pesapal-payment/index.ts`
-   **Token Acquisition**: Authenticates via `POST /api/Auth/RequestToken` using `consumer_key` and `consumer_secret`.
-   **IPN Management**: Features a "Check-then-Register" flow:
    1.  Calls `/api/URLSetup/GetIpnList` to see if the current URL is already registered.
    2.  If not, calls `/api/URLSetup/RegisterIPN` to get a new `notification_id`.
-   **Order Submission**: Requires a full `billing_address` object in the `SubmitOrderRequest` to pass validation.
-   **Strategic Improvement**: We should move from our current hardcoded `PESAPAL_IPN_ID` to this dynamic "GetOrRegister" logic to prevent payment failures if your domain ever changes.

---

## 4. OneSignal (Push Notifications)
### Implementation Logic: `package.json` & Frontend Init
-   **Library**: `react-onesignal`
-   **Usage**: Initialized in the root of the app to register service workers and capture device tokens.
-   **Strategic Improvement**: Implementing this in our new Next.js architecture will enable real-time dashboard alerts for staff without requiring them to refresh the page.

---

## 5. Supabase (Legacy Data)
### Implementation Logic: `src/integrations/supabase/client.ts`
-   **Usage**: Used as the primary Data Access Layer (DAL).
-   **Current Relevance**: These variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) are critical for our **Data Migration Utility**, allowing us to programmatically pull old customers and sales into the new Django database.

---

## 6. Implementation Integrity Check
| Variable | Correctly Used? | Notes |
| :--- | :--- | :--- |
| `EAZIREACH_API_KEY` | ✅ YES | Updated to use `X-API-Key` header. |
| `PESAPAL_IPN_ID` | ⚠️ PARTIAL | Functional, but should be made dynamic per legacy logic. |
| `SMS_CREDIT_COST` | ✅ YES | Used in backend calculations for credit deductions. |
