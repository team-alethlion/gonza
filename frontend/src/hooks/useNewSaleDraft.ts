/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from 'react';
import { useSaleDraft } from '@/hooks/useSaleDraft';
import { Sale } from '@/types';

export const useNewSaleDraft = (editSale?: Sale) => {
  const [showDraftNotification, setShowDraftNotification] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);

  const { hasDraft, loadDraft, clearDraft: clearDraftInternal, checkForDraft } = useSaleDraft();

  const refreshDraft = useCallback(() => {
    if (checkForDraft()) {
      const draft = loadDraft();
      if (draft) {
        setDraftData(draft);
      } else {
        setDraftData(null);
      }
    } else {
      setDraftData(null);
    }
  }, [checkForDraft, loadDraft]);

  // Automatically load draft on component mount
  useEffect(() => {
    if (!editSale) {
      refreshDraft();
    }
  }, [editSale, refreshDraft]);

  const handleLoadDraft = () => {
    // Clear the draft data after it's been loaded into the form
    setDraftData(null);
  };

  const handleClearDraft = useCallback(() => {
    clearDraftInternal();
    setDraftData(null);
  }, [clearDraftInternal]);

  const handleDismissDraft = () => {
    handleClearDraft();
    setShowDraftNotification(false);
  };

  return {
    showDraftNotification: false, // Always false for seamless auto-loading
    draftData,
    handleLoadDraft,
    handleDismissDraft,
    clearDraft: handleClearDraft,
    refreshDraft
  };
};