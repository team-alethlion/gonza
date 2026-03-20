
import { useState, useEffect } from 'react';

export const useAppUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Check localStorage for pending updates
    const checkUpdateStatus = () => {
      const updatePending = localStorage.getItem('app-update-available');
      setUpdateAvailable(updatePending === 'true');
    };

    checkUpdateStatus();

    // Listen for update messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UPDATE_AVAILABLE') {
        localStorage.setItem('app-update-available', 'true');
        setUpdateAvailable(true);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const triggerUpdate = async () => {
    setIsUpdating(true);
    
    try {
      // Clear the update flag
      localStorage.removeItem('app-update-available');
      
      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Reload the page to get the latest version
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('Error during update:', error);
      setIsUpdating(false);
      // Reset the update flag if update fails
      localStorage.setItem('app-update-available', 'true');
    }
  };

  return {
    updateAvailable,
    isUpdating,
    triggerUpdate
  };
};
