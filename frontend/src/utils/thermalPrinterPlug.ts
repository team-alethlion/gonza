import { Capacitor } from '@capacitor/core';

export async function checkBridgeStatus() {
  const addresses = ['http://localhost:5000', 'http://127.0.0.1:5000'];

  for (const addr of addresses) {
    try {
      const response = await fetch(`${addr}/printers`, {
        signal: AbortSignal.timeout(2000),
        mode: 'cors'
      });
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Continue to next address
    }
  }
  return false;
}

export async function print(data: string | Uint8Array, printerNameOverride?: string) {
  const platform = Capacitor.getPlatform();

  if (platform === 'web') {
    // Prefer Printer Bridge if on web
    try {
      const isBinary = data instanceof Uint8Array;
      const endpoint = 'http://localhost:5000/print/receipt';

      // Use provided printer name, or try to get it from localStorage (fallback to Receipt Printer)
      let printerName = printerNameOverride;
      if (!printerName) {
        try {
          const settings = JSON.parse(localStorage.getItem('business-settings') || '{}');
          printerName = settings.defaultPrinterName;
        } catch (e) {
          // Ignore parse errors
        }
      }

      if (!printerName) printerName = 'Receipt Printer';

      const body = {
        PrinterName: printerName,
        Content: isBinary ? String.fromCharCode(...(data as Uint8Array)) : data
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        body: JSON.stringify(body)
      });

      if (response.ok) {
        return { success: true, message: 'Print command sent to bridge.' };
      }
    } catch (err) {
      console.warn('Printer Bridge not available, falling back to Web Serial', err);
    }

    // Fallback to Web Serial for standard text data
    if (typeof data === 'string') {
      const { printWeb } = await import('./thermalPrinterWeb');
      return await printWeb(data);
    } else {
      return { success: false, message: 'Printer Bridge required for binary ESC/POS printing.' };
    }
  } else {
    // Native platforms use Bluetooth
    const { printBluetooth } = await import('./thermalPrinterNative');
    // Native print might only support strings for now, convert if needed
    const stringData = typeof data === 'string' ? data : new TextDecoder().decode(data);
    return await printBluetooth(stringData);
  }
}
