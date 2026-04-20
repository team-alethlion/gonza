/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from 'react';
import { useProductDraft } from '@/hooks/useProductDraft';

export const useNewProductDraft = (isEditMode: boolean = false) => {
  const [showDraftNotification, setShowDraftNotification] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);

  const { hasDraft, loadDraft, clearDraft: clearDraftInternal, checkForDraft } = useProductDraft();

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

  // Only check for drafts in "New Product" mode
  useEffect(() => {
    if (!isEditMode) {
      refreshDraft();
    }
  }, [isEditMode, refreshDraft]);

  const handleLoadDraft = () => {
    // We keep draftData so the form can consume it, 
    // but we hide the notification
    setDraftData(null);
  };

  const handleClearDraft = useCallback(() => {
    clearDraftInternal();
    setDraftData(null);
  }, [clearDraftInternal]);

  const handleDismissDraft = () => {
    handleClearDraft();
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
