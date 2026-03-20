import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { localDb } from "@/lib/dexie";
import { lookupProductByBarcodeAction } from "@/app/actions/products";
import { Product } from "@/types";

interface UseBarcodeScannerProps {
  currentBusinessId: string | undefined;
  handleAddItem: (product: any) => void;
  isFormDisabled: boolean;
}

export const useBarcodeScanner = ({
  currentBusinessId,
  handleAddItem,
  isFormDisabled,
}: UseBarcodeScannerProps) => {
  const scannerBufferRef = useRef("");
  const lastKeyTimeRef = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFormDisabled) return;

      const target = e.target as HTMLElement;
      const currentTime = Date.now();
      const delay = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Ignore special keys
      if (
        e.key === "Shift" ||
        e.key === "Control" ||
        e.key === "Alt" ||
        e.key === "Meta"
      ) {
        return;
      }

      // Threshold for scanner compatibility
      const isRapidTyping = delay < 60;
      const isAlphanumeric = /^[a-zA-Z0-9\-_]$/.test(e.key);

      // Interception logic
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true";
      
      if (!isInput && isAlphanumeric) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Handle Enter key (suffix of a scan)
      if (e.key === "Enter") {
        const scannedBarcode = scannerBufferRef.current.trim();
        if (scannedBarcode.length >= 2) {
          e.preventDefault();
          e.stopPropagation();

          const handleScan = async () => {
            // 1. Local Lookup
            let product = await localDb.products
              .where("barcode")
              .equals(scannedBarcode)
              .or("itemNumber")
              .equals(scannedBarcode)
              .first();

            // 2. Server Lookup Fallback
            if (!product && currentBusinessId) {
              const serverResult = await lookupProductByBarcodeAction(
                scannedBarcode,
                currentBusinessId,
              );
              if (serverResult) {
                product = {
                  ...serverResult,
                  createdAt: new Date(serverResult.createdAt),
                  updatedAt: new Date(serverResult.updatedAt),
                } as any;
                localDb.products.put(product as Product);
              }
            }

            if (product) {
              handleAddItem(product);
              toast.success(`Scanned: ${product.name}`);
            } else {
              toast.error(`Product not found: ${scannedBarcode}`);
            }
          };

          handleScan();
          scannerBufferRef.current = "";
          return;
        }
        scannerBufferRef.current = "";
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Add character to buffer
      if (e.key && typeof e.key === 'string' && e.key.length === 1) {
        if (isRapidTyping && isInput && isAlphanumeric) {
          e.preventDefault();
          e.stopPropagation();
        }

        if (delay > 100) {
          scannerBufferRef.current = e.key;
        } else {
          scannerBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [currentBusinessId, handleAddItem, isFormDisabled]);

  return {
    scannerBufferRef,
  };
};
