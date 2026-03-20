/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useSaleDraft } from '@/hooks/useSaleDraft';
import { Sale } from '@/types';

export const useNewSaleDraft = (editSale?: Sale) => {
  const [showDraftNotification, setShowDraftNotification] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);

  const { hasDraft, loadDraft, clearDraft, checkForDraft } = useSaleDraft();

  // Automatically load draft on component mount
  useEffect(() => {
    if (!editSale) {
      const loadDraftAutomatically = () => {
        if (checkForDraft()) {
          const draft = loadDraft();
          if (draft) {
            setDraftData(draft);
          }
        }
      };

      // Load immediately
      loadDraftAutomatically();
    }
  }, [editSale, checkForDraft, loadDraft]);

  const handleLoadDraft = () => {
    // Clear the draft data after it's been loaded into the form
    setDraftData(null);
  };

  const handleDismissDraft = () => {
    clearDraft();
    setShowDraftNotification(false);
    setDraftData(null);
  };

  return {
    showDraftNotification: false, // Always false for seamless auto-loading
    draftData,
    handleLoadDraft,
    handleDismissDraft,
    clearDraft
  };
};