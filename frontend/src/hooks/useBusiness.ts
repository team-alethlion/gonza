
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getBusinessLocationsAction, createBusinessAction, updateBusinessAction, deleteBusinessAction } from '@/app/actions/business';

export interface BusinessLocation {
  id: string;
  name: string;
  userId: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mapDbToBusinessLocation = (db: any): BusinessLocation => ({
  id: db.id,
  name: db.name,
  userId: db.user_id,
  isDefault: db.is_default ?? false,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

export const useBusiness = (userId: string | undefined) => {
  const [businesses, setBusinesses] = useState<BusinessLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadBusinesses = async () => {
    if (!userId) { setBusinesses([]); setIsLoading(false); return; }
    try {
      setIsLoading(true);
      const data = await getBusinessLocationsAction(userId);
      setBusinesses(data ? data.map(mapDbToBusinessLocation) : []);
    } catch (err) {
      console.error('Error loading businesses:', err);
      toast({ title: 'Error', description: 'Failed to load business locations.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const createBusiness = async (name: string): Promise<BusinessLocation | null> => {
    if (!userId) return null;
    try {
      const result = await createBusinessAction(userId, name);
      if (!result.success || !result.data) throw new Error(result.error);
      const newBusiness = mapDbToBusinessLocation(result.data);
      setBusinesses(prev => [...prev, newBusiness]);
      toast({ title: 'Success', description: 'Business location created.' });
      return newBusiness;
    } catch (err) {
      console.error('Error creating business:', err);
      toast({ title: 'Error', description: 'Failed to create business location.', variant: 'destructive' });
      return null;
    }
  };

  const updateBusiness = async (id: string, name: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const result = await updateBusinessAction(id, userId, name);
      if (!result.success) throw new Error(result.error);
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, name } : b));
      toast({ title: 'Success', description: 'Business location updated.' });
      return true;
    } catch (err) {
      console.error('Error updating business:', err);
      toast({ title: 'Error', description: 'Failed to update business location.', variant: 'destructive' });
      return false;
    }
  };

  const deleteBusiness = async (id: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const result = await deleteBusinessAction(id, userId);
      if (!result.success) throw new Error(result.error);
      setBusinesses(prev => prev.filter(b => b.id !== id));
      toast({ title: 'Success', description: 'Business location deleted.' });
      return true;
    } catch (err) {
      console.error('Error deleting business:', err);
      toast({ title: 'Error', description: 'Failed to delete business location.', variant: 'destructive' });
      return false;
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, [userId]);

  return {
    businesses,
    isLoading,
    loadBusinesses,
    createBusiness,
    updateBusiness,
    deleteBusiness,
  };
};
