# Implementation Plan: Messaging System Refinement

## 1. Executive Summary
The messaging system currently handles basic CRUD for messages and templates but lacks the integration "engine" for actual delivery. Furthermore, the frontend is performing heavy data processing (customer segmentation, bulk iteration) that should be handled by the backend for scalability and reliability.

---

## 2. Identified Discrepancies & Missing Logic

### A. Missing Backend "Worker" Logic
-   **Gateway Integration**: No code exists to connect with SMS providers (e.g., Africa's Talking) or WhatsApp APIs.
-   **Background Processing**: Sending messages happens synchronously or via mock logic. Needs Celery/Background workers for reliability.
-   **Status Webhooks**: No mechanism to receive "Delivered" or "Failed" callbacks from providers to update message status.

### B. Frontend-Heavy Logic (To be moved to Backend)
-   **Bulk Messaging**: Currently iterates over customers in the frontend and sends individual API requests. Should be a single atomic `/bulk-send/` endpoint.
-   **Customer Segmentation**: Logic to find "Inactive" or "Unpaid" customers is currently calculated by fetching ALL sales and ALL customers to the browser. 
-   **Message Preparation**: Character counting and credit estimation (`Math.ceil(len/160)`) should be verified by the backend.
-   **Phone Formatting**: Formatting logic (`+256...`) should be centralized in a backend utility.

### C. Incomplete Features
-   **Credit Top-up**: `initiateCreditPurchase` is a placeholder.
-   **WhatsApp Sessions**: Infrastructure exists for sessions, but actual message relay logic is missing.
-   **Variable Parsing**: No backend engine to replace `{{customer_name}}` in templates.

---

## 3. Proposed Backend Architecture

### A. Modular Logic Services (`backend/messaging/logic/`)
1.  **`gateway_sms.py`**: Abstraction layer for SMS providers.
2.  **`gateway_whatsapp.py`**: Logic for managing WhatsApp sessions and sending via instance.
3.  **`bulk_processor.py`**: Handles expansion of customer IDs, template parsing, and credit validation.
4.  **`credit_manager.py`**: Handles atomic deduction, refunds for failed messages, and purchase logging.

### B. API Enhancements
1.  **`/api/messaging/messages/bulk_send/`**: Receives `customer_ids` and `template_id`.
2.  **`/api/customers/segment/`**: Returns filtered customer lists based on activity/balance using SQL aggregation.
3.  **`/api/messaging/whatsapp/status/`**: WebSocket or Polling endpoint for real-time session status.

---

## 4. Frontend Refinement

### A. Component Optimization
-   **`BulkMessageDialog.tsx`**: Replace local sales-filtering logic with a call to the new `/api/customers/segment/` endpoint.
-   **`useMessages.ts`**: Replace individual loops in `createBulkMessages` with a single server action call.

---

## 5. Implementation Sequence
1.  **Backend Services**: Implement `credit_manager.py` and `bulk_processor.py`.
2.  **API Refactor**: Create the `bulk_send` endpoint and move segmentation to the backend.
3.  **Gateway Integration**: Implement a real or simulation driver for SMS delivery.
4.  **Frontend Sync**: Update hooks to use the new optimized API paths.
