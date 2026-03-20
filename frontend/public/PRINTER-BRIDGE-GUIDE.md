# Printer Bridge - Setup & API Guide 🚀

The Printer Bridge is a high-performance local service that connects your Web Application to Thermal Printers (USB and Bluetooth/Serial).

---

## 🛠 Setup Guide

### 1. Installation
1. **Download** the `PrinterBridge_Setup.zip` file.
2. **Unzip** (Extract) the folder to your computer.
3. **Right-click** on `PrinterBridgeService.exe` and select **Run as administrator**.
4. Select **1. Install Service** from the menu.
5. Setup is complete! The bridge now runs in the background.

> [!TIP]
> For advanced users or automated deployments, you can use command-line flags:
> - `PrinterBridgeService.exe --install`
> - `PrinterBridgeService.exe --uninstall`

### 2. Printer Selection
Configure your default printer by sending a POST request or using your Web App's setup UI:
```bash
POST http://localhost:5000/setup
Content-Type: application/json
{
  "DefaultPrinterName": "Your Printer Name",
  "ConnectionType": "USB"
}
```

---

## 📡 API Endpoint Guide

### 1. List All Printers
Get a list of all connected USB and Bluetooth devices with real-time status.
- **URL**: `GET http://localhost:5000/printers`
- **Output**:
  ```json
  [
    {
      "name": "POS-58",
      "type": "SPOOLER",
      "status": "Ready",
      "isOnline": true,
      "message": "OK"
    }
  ]
  ```

### 2. Print Label (TSPL)
Best for barcodes and stickers.
- **URL**: `POST http://localhost:5000/print/label`
- **Payload**:
  ```json
  {
    "PrinterName": "Gprinter GP-2120TUA",
    "Content": "SIZE 40 mm, 30 mm\nGAP 3 mm, 0 mm\nCLS\nBARCODE 10,10,\"128\",50,1,0,2,2,\"12345\"\nPRINT 1\n"
  }
  ```

### 3. Print Receipt (ESC/POS)
Best for sales receipts and invoices.
- **URL**: `POST http://localhost:5000/print/receipt`
- **Payload**:
  ```json
  {
    "PrinterName": "POS-58",
    "Content": "      STORE NAME\n--------------------\nTotal: $10.00\n\n"
  }
  ```

### 4. Direct Status Check
Check a specific printer without loading the whole list.
- **URL**: `GET http://localhost:5000/printers/{name}/status`

---

## 💻 Web Integration Tip

Use this logic in your React/Next.js app to auto-detect the bridge:
```javascript
async function checkBridge() {
  try {
    const res = await fetch('http://localhost:5000/');
    return res.ok;
  } catch {
    return false;
  }
}
```
If `false`, show a "Download Printer Bridge" button to your user.

---

## 🛠 Troubleshooting

### "Popup remains open / Console window is visible"
If you see a black console window (the popup), it means the bridge is running in **Console Mode** instead of as a **Windows Service**.
- **Issue**: Closing this window will stop the printer bridge.
- **Fix**: Run the `PrinterBridgeService.exe` and select **1. Install Service**. This will install it as a background service that starts automatically with Windows and has no visible window.

### "Service fails to start"
1. Ensure you have the [.NET Runtime](https://dotnet.microsoft.com/download) installed.
2. Check the **Windows Event Viewer** under "Windows Logs > Application" for errors from `PrinterBridgeService`.
