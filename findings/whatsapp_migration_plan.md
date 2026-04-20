# Implementation Plan: WhatsApp "Linked Device" Migration (Technical)

## 1. Objective
Synchronize the current WhatsApp integration with the proven legacy logic found in the `prev` project. This ensures full compatibility with the Eazireach V1 Instance API and provides a reliable, server-side messaging experience.

---

## 2. Environment Variables
The following variables from the legacy project are required and already confirmed in the current `.env`:
-   `EAZIREACH_API_KEY`: The primary secret key.
-   `EAZIREACH_ACCOUNT_ID`: Your unique workspace identifier.
-   `WHATSAPP_API_URL`: Should be `https://api.eazireach.com/api/v1`.

---

## 3. Backend Refinement (`backend/messaging/logic/`)

### A. Refined Eazireach Driver (`gateways/whatsapp_gateway.py`)
Update the driver to match the legacy `MessagingService`:
1.  **`initialize_session`**: 
    -   Step 1: Create instance via `POST /whatsapp/instance`.
    -   Step 2: Trigger connection via `GET /whatsapp/connect/{name}?number={phone}&method=qrCode`.
2.  **`get_status`**: Poll `/whatsapp/status/{name}`. 
    -   **Legacy Validation**: Must check `data.instance.state == 'open'` or `connected == True`.
3.  **`send_message`**: Use the unified `POST /send` endpoint.
    -   **Payload Requirement**: Include `whatsappInstance: "name"` and `channel: ["whatsapp"]`.
    -   **Media Support**: Automatically detect `mediaType` (image/video) based on URL extension.

### B. Unified Bulk Processor (`core/bulk_processor.py`)
-   **Channel Logic**: Allow sending to both SMS and WhatsApp in a single API call by passing `channel: ["sms", "whatsapp"]`.
-   **Instance Guard**: Block WhatsApp jobs if the user's `WhatsAppSession` is not in an `open` state.

---

## 4. Frontend Integration (`frontend/src/`)

### A. Pairing UI Refinement
Update `WhatsAppConnection.tsx`:
-   **Retry Logic**: Implement the legacy 2-second delay retry when fetching connection data if the `pairingCode` or `base64` QR is initially null.
-   **Status Badges**: Align status labels with legacy states: `open` (Connected), `connecting`, `disconnected`.

### B. Messaging Dialogs
-   **Channel Multi-Select**: Allow users to select both SMS and WhatsApp for a single message/campaign.

---

## 5. Implementation Priority
1.  **Gateway Overhaul**: Re-write `whatsapp_gateway.py` to use the legacy `/whatsapp/instance` and `/whatsapp/connect` endpoints.
2.  **Status Logic**: Update the polling parser to recognize the `data.instance.state` field from Eazireach.
3.  **Unified Send**: Refactor the bulk processor to support the dual-channel payload used in the Supabase functions.
4.  **Verification**: Test "Scan to Pair" and verify that credits are correctly deducted for both SMS and WhatsApp segments.
