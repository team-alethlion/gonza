import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sale } from '@/types';

export const useSalesActions = () => {
  const router = useRouter();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isDeletingSale, setIsDeletingSale] = useState(false);

  const handleEditSale = useCallback((sale: Sale) => {
    router.push(`/agency/new-sale?editId=${sale.id}`);
  }, [router]);

  const handleViewReceipt = useCallback((sale: Sale) => {
    setSelectedSale(sale);
    setIsReceiptDialogOpen(true);
  }, []);

  const handleProcessReturn = useCallback((sale: Sale) => {
    setSelectedSale(sale);
    setIsReturnDialogOpen(true);
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

  const handleCloseReturnDialog = useCallback((open: boolean) => {
    setIsReturnDialogOpen(open);
    if (!open) setSelectedSale(null);
  }, []);

  return {
    selectedSale,
    isReceiptDialogOpen,
    isReturnDialogOpen,
    isDeletingSale,
    handleEditSale,
    handleViewReceipt,
    handleProcessReturn,
    handleDeleteSale,
    handleCloseReceiptDialog,
    handleCloseReturnDialog
  };
};
