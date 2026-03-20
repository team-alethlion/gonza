import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProductFormData } from '@/types';
import { useBusiness } from '@/contexts/BusinessContext';

export const useProductDraft = () => {
  const { currentBusiness } = useBusiness();

  const DRAFT_STORAGE_KEY = useMemo(() =>
    currentBusiness?.id ? `product_draft_${currentBusiness.id}` : 'product_draft'
    , [currentBusiness]);

  const SESSION_BACKUP_KEY = useMemo(() =>
    currentBusiness?.id ? `product_backup_session_${currentBusiness.id}` : 'product_backup_session'
    , [currentBusiness]);

  const [hasDraft, setHasDraft] = useState(() => {
    if (typeof window === 'undefined') return false;
    const businessId = currentBusiness?.id;
    const persistentKey = businessId ? `product_draft_${businessId}` : 'product_draft';
    const sessionKey = businessId ? `product_backup_session_${businessId}` : 'product_backup_session';
    return !!localStorage.getItem(persistentKey) || !!sessionStorage.getItem(sessionKey);
  });

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

  const saveDraft = useCallback((formData: any, isPersistent = true) => {
    if (!currentBusiness?.id) return;

    // We don't want to save the actual image file object in storage, just the metadata
    const { imageFile, ...serializableData } = formData;

    const draftData = {
      formData: serializableData,
      savedAt: new Date().toISOString()
    };

    const dataString = JSON.stringify(draftData);
    sessionStorage.setItem(SESSION_BACKUP_KEY, dataString);

    if (isPersistent) {
      localStorage.setItem(DRAFT_STORAGE_KEY, dataString);
    }
    
    setHasDraft(true);
  }, [DRAFT_STORAGE_KEY, SESSION_BACKUP_KEY, currentBusiness?.id]);

  const loadDraft = useCallback(() => {
    let draft = sessionStorage.getItem(SESSION_BACKUP_KEY);
    if (!draft) {
      draft = localStorage.getItem(DRAFT_STORAGE_KEY);
    }

    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        return {
          formData: parsedDraft.formData,
          savedAt: new Date(parsedDraft.savedAt)
        };
      } catch (error) {
        console.error('Error parsing product draft:', error);
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
