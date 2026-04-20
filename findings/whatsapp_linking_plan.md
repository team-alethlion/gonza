# Implementation Plan: WhatsApp "Linked Device" Integration

## 1. Objective

Allow users to connect their existing WhatsApp accounts to the application by scanning a QR code (similar to WhatsApp Web). This enables the system to send automated receipts, reminders, and bulk messages through the user's official WhatsApp number.

---

## 2. Backend Architecture (Already Prepared)

- **Model**: `WhatsAppSession` stores the `instance_name` and real-time `status`.
- **Gateway**: `whatsapp_gateway.py` acts as the driver to the external Instance API (Eazireach).
- **Endpoints**:
  - `POST /initialize/`: Creates the instance and returns a QR code.
  - `GET /status/`: Polls the gateway to see if the user has scanned the QR.
  - `POST /disconnect/`: Logs out the device.

---

## 3. Frontend Implementation (`frontend/src/`)

### A. New Component: `WhatsAppConnection.tsx`

Create a dedicated management UI within the "WhatsApp" tab:

1.  **State View (Disconnected)**: A "Connect WhatsApp" button to start the process.
2.  **State View (Connecting)**:
    - Displays the **QR Code** fetched from the backend.
    - Instructional text: "Go to WhatsApp > Settings > Linked Devices > Link a Device".
    - Auto-polls the `/status/` endpoint every 5 seconds.
3.  **State View (Connected)**:
    - Shows the linked phone number and a "Connected" badge.
    - "Disconnect" button to unlink the device.

### B. Messaging Channel Selection

Update `NewMessageDialog.tsx` and `BulkMessageDialog.tsx`:

- Add a **"Channel"** toggle: `[SMS] | [WhatsApp]`.
- If WhatsApp is selected but not connected, show a warning with a link to the settings tab.

---

## 4. Logical Workflow

1.  **Handshake**: User clicks "Connect". Backend tells Eazireach to create a unique instance `gonza_user123`.
2.  **Pairing**: Eazireach returns a Base64 QR code. Frontend displays it.
3.  **Authentication**: User scans with their phone. Official WhatsApp app handles the encryption.
4.  **Verification**: Backend status changes to `connected`. Frontend stops polling and shows success.
5.  **Sending**: When a message is sent via WhatsApp, the backend relays it to the specific instance.

---

## 5. Implementation Sequence

1.  **Logic Update**: Ensure `whatsapp_gateway.py` correctly parses the Base64 QR from the Eazireach response.
2.  **UI Component**: Build the `WhatsAppConnection` manager.
3.  **Action Integration**: Add `channel` support to `process_bulk_send` on the backend.
4.  **Verification**: Test with a real phone pairing.
