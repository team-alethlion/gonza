import React, { useEffect, useRef } from "react";

interface UseSaleDraftAutoSaveProps {
  initialData: any;
  loading: boolean;
  isSubmitted: boolean;
  formRecentlyCleared: boolean;
  formData: any;
  selectedDate: Date;
  saveDraft: (formData: any, date: Date, persistent: boolean) => void;
  isClearingRef: React.MutableRefObject<boolean>;
  isReceiptOpen?: boolean;
}

export const useSaleDraftAutoSave = ({
  initialData,
  loading,
  isSubmitted,
  formRecentlyCleared,
  formData,
  selectedDate,
  saveDraft,
  isClearingRef,
  isReceiptOpen = false,
}: UseSaleDraftAutoSaveProps) => {
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  const lastSavedDataRef = useRef<string>("");

  const autoSaveDraft = React.useCallback(
    (isPersistent = true) => {
      // Check ref to prevent saving during clear operation or if receipt is open
      if (isClearingRef.current || isReceiptOpen) return;

      if (!initialData && !loading && !isSubmitted && !formRecentlyCleared) {
        const hasData =
          formData.customerName.trim() ||
          formData.customerAddress.trim() ||
          formData.customerContact.trim() ||
          formData.items.some(
            (item: any) =>
              item.description.trim() ||
              item.quantity !== 1 ||
              item.price !== 0,
          );

        if (hasData) {
          // ⚡️ PERFORMANCE: Deep comparison to avoid redundant writes
          const currentDataString = JSON.stringify({ formData, selectedDate: selectedDate.toISOString() });
          if (currentDataString !== lastSavedDataRef.current) {
            saveDraft(formData, selectedDate, isPersistent);
            lastSavedDataRef.current = currentDataString;
          }
        }
      }
    },
    [
      formData,
      selectedDate,
      initialData,
      loading,
      saveDraft,
      isSubmitted,
      formRecentlyCleared,
      isClearingRef
    ],
  );

  useEffect(() => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    // ⚡️ SPEED: Debounced session save (1s) to prevent "keyboard lag"
    const sessionTimer = setTimeout(() => autoSaveDraft(false), 1000);

    // ⚡️ PERSISTENCE: Debounced persistent save (localStorage) every 5s
    autoSaveTimeoutRef.current = setTimeout(() => autoSaveDraft(true), 5000);

    return () => {
      clearTimeout(sessionTimer);
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [autoSaveDraft]);

  useEffect(() => {
    const handleBeforeUnload = () => autoSaveDraft();
    const handleVisibilityChange = () => document.hidden && autoSaveDraft();
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoSaveDraft]);
};
