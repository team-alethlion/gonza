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
}: UseSaleDraftAutoSaveProps) => {
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  const autoSaveDraft = React.useCallback(
    (isPersistent = true) => {
      // Check ref to prevent saving during clear operation
      if (isClearingRef.current) return;

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
          saveDraft(formData, selectedDate, isPersistent);
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

    // ⚡️ SPEED: Immediate session save (no timeout) for critical data loss prevention
    autoSaveDraft(false);

    // ⚡️ PERSISTENCE: Debounced persistent save (localStorage) every 2s
    autoSaveTimeoutRef.current = setTimeout(() => autoSaveDraft(true), 2000);

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      autoSaveDraft(true); // Save on unmount
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
