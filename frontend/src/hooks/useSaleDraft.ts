import { useState, useEffect, useCallback, useMemo } from 'react';
import { SaleFormData } from '@/types';
import { useBusiness } from '@/contexts/BusinessContext';

export const useSaleDraft = () => {
  const { currentBusiness } = useBusiness();

  const DRAFT_STORAGE_KEY = useMemo(() =>
    currentBusiness?.id ? `sale_draft_${currentBusiness.id}` : 'sale_draft'
    , [currentBusiness]);

  const SESSION_BACKUP_KEY = useMemo(() =>
    currentBusiness?.id ? `sale_backup_session_${currentBusiness.id}` : 'sale_backup_session'
    , [currentBusiness]);

  const [hasDraft, setHasDraft] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Initial check: if we have a persistent draft OR a session backup
    const businessId = currentBusiness?.id;
    const persistentKey = businessId ? `sale_draft_${businessId}` : 'sale_draft';
    const sessionKey = businessId ? `sale_backup_session_${businessId}` : 'sale_backup_session';
    return !!localStorage.getItem(persistentKey) || !!sessionStorage.getItem(sessionKey);
  });

  // Check if draft exists
  const checkForDraft = useCallback(() => {
    const hasPersistent = !!localStorage.getItem(DRAFT_STORAGE_KEY);
    const hasSession = !!sessionStorage.getItem(SESSION_BACKUP_KEY);
    const draftExists = hasPersistent || hasSession;
    setHasDraft(draftExists);
    return draftExists;
  }, [DRAFT_STORAGE_KEY, SESSION_BACKUP_KEY]);

  useEffect(() => {
    if (currentBusiness?.id) {
      const timer = setTimeout(() => {
        checkForDraft();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [DRAFT_STORAGE_KEY, SESSION_BACKUP_KEY, currentBusiness?.id, checkForDraft]);

  const saveDraft = useCallback((formData: SaleFormData, selectedDate: Date, isPersistent = true) => {
    if (!currentBusiness?.id) return;

    const draftData = {
      formData,
      selectedDate: selectedDate.toISOString(),
      savedAt: new Date().toISOString()
    };

    const dataString = JSON.stringify(draftData);

    // 1. Always save to Session Storage (Fast, reliable for refreshes)
    sessionStorage.setItem(SESSION_BACKUP_KEY, dataString);

    // 2. Conditionally save to Local Storage (Slower, persistent for tab closes)
    if (isPersistent) {
      localStorage.setItem(DRAFT_STORAGE_KEY, dataString);
    }
    
    setHasDraft(true);
  }, [DRAFT_STORAGE_KEY, SESSION_BACKUP_KEY, currentBusiness?.id]);

  const loadDraft = useCallback(() => {
    // Priority 1: Session backup (most recent usually)
    let draft = sessionStorage.getItem(SESSION_BACKUP_KEY);
    
    // Priority 2: Persistent draft
    if (!draft) {
      draft = localStorage.getItem(DRAFT_STORAGE_KEY);
    }

    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        return {
          formData: parsedDraft.formData,
          selectedDate: new Date(parsedDraft.selectedDate),
          savedAt: new Date(parsedDraft.savedAt)
        };
      } catch (error) {
        console.error('Error parsing draft:', error);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        sessionStorage.removeItem(SESSION_BACKUP_KEY);
        setHasDraft(false);
        return null;
      }
    }
    return null;
  }, [DRAFT_STORAGE_KEY, SESSION_BACKUP_KEY]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_BACKUP_KEY);
    setHasDraft(false);
  }, [DRAFT_STORAGE_KEY, SESSION_BACKUP_KEY]);

  return {
    hasDraft,
    saveDraft,
    loadDraft,
    clearDraft,
    checkForDraft
  };
};
