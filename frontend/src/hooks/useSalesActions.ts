import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sale } from '@/types';

export const useSalesActions = () => {
  const router = useRouter();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isDeletingSale, setIsDeletingSale] = useState(false);

  const handleEditSale = useCallback((sale: Sale) => {
    // Next.js params will be handled differently perhaps, but router.push does not take state object easily.
    // Assuming edit goes to new-sale page, but new-sale usually uses id param instead of passing the whole object
    // For now we push to /agency/new-sale?editId=${sale.id} or similar.
    router.push(`/agency/new-sale?editId=${sale.id}`);
  }, [router]);

  const handleViewReceipt = useCallback((sale: Sale) => {
    setSelectedSale(sale);
    setIsReceiptDialogOpen(true);
  }, []);

  const handleDeleteSale = useCallback((deleteSale: (id: string, reason?: string) => Promise<boolean>) => {
    return async (sale: Sale, reason?: string) => {
      setIsDeletingSale(true);
      try {
        await deleteSale(sale.id, reason);
      } finally {
        setIsDeletingSale(false);
      }
    };
  }, []);

  const handleCloseReceiptDialog = useCallback((open: boolean) => {
    setIsReceiptDialogOpen(open);
    if (!open) setSelectedSale(null);
  }, []);

  return {
    selectedSale,
    isReceiptDialogOpen,
    isDeletingSale,
    handleEditSale,
    handleViewReceipt,
    handleDeleteSale,
    handleCloseReceiptDialog
  };
};