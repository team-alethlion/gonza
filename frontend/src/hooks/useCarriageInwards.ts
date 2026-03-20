
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { useToast } from '@/hooks/use-toast';
import {
  getCarriageInwardsAction,
  createCarriageInwardAction,
  updateCarriageInwardAction,
  deleteCarriageInwardAction,
} from '@/app/actions/carriageInwards';

export interface CarriageInward {
  id: string;
  userId: string;
  locationId: string;
  supplierName: string;
  details: string;
  amount: number;
  date: Date;
  cashAccountId?: string;
  cashTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarriageInwardFormData {
  supplierName: string;
  details: string;
  amount: number;
  date: Date;
  cashAccountId?: string;
}

export const useCarriageInwards = () => {
  const [carriageInwards, setCarriageInwards] = useState<CarriageInward[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();

  const loadCarriageInwards = useCallback(async () => {
    if (!user || !currentBusiness) { setCarriageInwards([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const result = await getCarriageInwardsAction(currentBusiness.id);
      if (!result.success) throw new Error(result.error);
      setCarriageInwards((result.data || []).map((item: any) => ({
        ...item,
        date: new Date(item.date),
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })));
    } catch (error) {
      console.error('Error loading carriage inwards:', error);
      toast({ title: 'Error', description: 'Failed to load carriage inwards records.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentBusiness?.id, toast]);

  const createCarriageInward = async (data: CarriageInwardFormData) => {
    if (!user || !currentBusiness) throw new Error('User not authenticated or no business selected');
    const result = await createCarriageInwardAction(user.id, currentBusiness.id, data);
    if (!result.success) throw new Error(result.error);
    await loadCarriageInwards();
    toast({ title: 'Success', description: 'Carriage inwards record created successfully' });
    return result.data;
  };

  const updateCarriageInward = async (id: string, updates: Partial<CarriageInwardFormData>) => {
    if (!currentBusiness) throw new Error('No business selected');
    const result = await updateCarriageInwardAction(id, currentBusiness.id, updates);
    if (!result.success) throw new Error(result.error);
    await loadCarriageInwards();
    toast({ title: 'Success', description: 'Carriage inwards record updated successfully' });
    return true;
  };

  const deleteCarriageInward = async (id: string) => {
    if (!currentBusiness) throw new Error('No business selected');
    const result = await deleteCarriageInwardAction(id, currentBusiness.id);
    if (!result.success) throw new Error(result.error);
    await loadCarriageInwards();
    toast({ title: 'Success', description: 'Carriage inwards record deleted successfully' });
    return true;
  };

  useEffect(() => { loadCarriageInwards(); }, [loadCarriageInwards]);

  return { carriageInwards, isLoading, createCarriageInward, updateCarriageInward, deleteCarriageInward, refreshCarriageInwards: loadCarriageInwards };
};
