# Implementation Plan: Eazireach WhatsApp Integration & Migration (FINALIZED)

## 1. Context Analysis
-   **Legacy State (`prev`)**: 
    -   **SMS**: Fully automated via Eazireach API (`/api/v1/send`).
    -   **WhatsApp**: Purely client-side via `window.open('https://wa.me/...')`. No automation possible.
-   **Current Goal**: 100% Automation. Use Eazireach's **WhatsApp Instance API** to allow the backend to send messages without user intervention.

---

## 2. Technical Architecture (`backend/messaging/`)

### A. Eazireach Gateway Driver (`logic/gateways/whatsapp_gateway.py`)
Perfect the driver for Eazireach's Instance-based communication:
1.  **Session Lifecycle**: 
    -   `initialize_session`: Requests a new instance and retrieves the Base64 QR code.
    -   `get_status`: Polls for the `connected` state after the user scans.
2.  **Message Relay**:
    -   `send_message`: Sends text and media to the Eazireach relay endpoint.

### B. Unified Messaging logic (`logic/core/bulk_processor.py`)
Ensure the bulk processor can dynamically switch between Vernra (SMS) and Eazireach (WhatsApp):
-   **Cost Logic**: WhatsApp often has different credit implications (or is "free" after the instance cost). The `CreditManager` will handle these rules.
-   **Failure Handling**: Implement specific retry logic for WhatsApp instances (e.g., re-pairing if session expires).

---

## 3. Frontend Integration (`frontend/src/`)

### A. WhatsApp Management UI (`components/messages/WhatsAppConnection.tsx`)
-   **QR Scanner**: Provide the high-fidelity QR interface already implemented.
-   **Connection Guard**: Show real-time "Connected" status with the linked phone number.

### B. Dialog Enhancements
-   **`BulkMessageDialog.tsx`**: (DONE) Backend-driven segmentation.
-   **Channel Selection**: (TODO) Add a toggle to let users choose the delivery medium.

---

## 4. Logical Priority (Execution Order)
1.  **Integration**: Point `WHATSAPP_API_URL` to Eazireach V1/V2 production.
2.  **Refinement**: Implement the `channel` field in the `bulk_send` action to allow WhatsApp delivery.
3.  **UI Sync**: Add the channel toggle to the messaging dialogs.
4.  **Verification**: Conduct a real "Scan to Pair" test with a business phone.
