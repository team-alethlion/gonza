/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  getRequisitionsAction,
  createRequisitionAction,
  updateRequisitionAction,
  deleteRequisitionAction
} from '@/app/actions/inventory';

export interface Requisition {
  id: string;
  userId: string;
  branchId: string;
  requisitionNumber: string;
  title: string | null;
  items: RequisitionItem[];
  notes: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED' | string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequisitionItem {
  id: string;
  productName: string;
  sku: string | null;
  quantity: number;
  urgentItem?: boolean;
}

import { localDb } from '@/lib/dexie';

export const useRequisitions = (userId: string | undefined, locationId: string | undefined) => {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load from Dexie cache on mount
  useEffect(() => {
    const loadFromCache = async () => {
      if (locationId && requisitions.length === 0) {
        const cached = await localDb.requisitions
          .where('locationId')
          .equals(locationId)
          .reverse()
          .sortBy('createdAt');
        
        if (cached && cached.length > 0) {
          console.log('[Requisitions] Loaded from Dexie cache');
          setRequisitions(cached.map((r: any) => ({
            ...r,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt)
          })));
          setIsLoading(false);
        }
      }
    };
    loadFromCache();
  }, [locationId, requisitions.length]);

  const loadRequisitions = async () => {
    if (!userId || !locationId) {
      setRequisitions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(requisitions.length === 0);
      const result = await getRequisitionsAction(userId, locationId);
      if (result.success) {
        // Sanitize: getRequisitionsAction returns { data: { requisitions: [] } }
        const rawData = Array.isArray(result.data?.requisitions) ? result.data.requisitions : [];
        
        const fetched = rawData.map((req: any) => ({
          ...req,
          createdAt: new Date(req.createdAt || req.created_at || req.date),
          updatedAt: new Date(req.updatedAt || req.updated_at || req.date),
          branchId: req.branchId || req.branch || locationId
        }));

        // Update Dexie cache in the background
        if (fetched.length > 0) {
          const cacheData = fetched.map((r: any) => ({
            ...r,
            locationId: locationId,
          }));
          await localDb.requisitions.where('locationId').equals(locationId).delete();
          await localDb.requisitions.bulkPut(cacheData as any);
        }

        setRequisitions(fetched);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error loading requisitions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load requisitions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequisitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, locationId]);

  const createRequisition = async (
    title: string,
    items: any[],
    notes?: string
  ): Promise<Requisition | null> => {
    if (!userId || !locationId) return null;

    try {
      const requisitionNumber = generateRequisitionNumber();

      const result = await createRequisitionAction({
        userId,
        locationId,
        requisitionNumber,
        title,
        items,
        notes: notes || null,
        priority: 'NORMAL'
      });

      if (!result.success || !result.data) {
        throw new Error(result.error);
      }

      const data = result.data;
      const newRequisition: Requisition = {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        branchId: data.branchId || locationId
      };

      setRequisitions(prev => [newRequisition, ...prev]);

      toast({
        title: "Requisition created",
        description: `Requisition ${requisitionNumber} has been created successfully.`
      });

      return newRequisition;
    } catch (error: any) {
      console.error('Error creating requisition:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create requisition. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateRequisition = async (
    id: string,
    updates: any
  ): Promise<boolean> => {
    if (!userId || !locationId) return false;

    try {
      const result = await updateRequisitionAction(id, locationId, userId, updates);

      if (!result.success || !result.data) {
        throw new Error(result.error);
      }

      const data = result.data;
      const updatedRequisition: Requisition = {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        branchId: data.branchId || locationId
      };

      setRequisitions(prev => prev.map(req => req.id === id ? updatedRequisition : req));

      toast({
        title: "Requisition updated",
        description: "Requisition has been updated successfully."
      });

      return true;
    } catch (error: any) {
      console.error('Error updating requisition:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update requisition. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteRequisition = async (id: string): Promise<boolean> => {
    if (!userId || !locationId) return false;

    try {
      const result = await deleteRequisitionAction(id, locationId, userId);

      if (!result.success) {
        throw new Error(result.error);
      }

      setRequisitions(prev => prev.filter(req => req.id !== id));

      toast({
        title: "Requisition deleted",
        description: "Requisition has been deleted successfully."
      });

      return true;
    } catch (error) {
      console.error('Error deleting requisition:', error);
      toast({
        title: "Error",
        description: "Failed to delete requisition. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    requisitions,
    isLoading,
    loadRequisitions,
    createRequisition,
    updateRequisition,
    deleteRequisition
  };
};

const generateRequisitionNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const time = date.getTime().toString().slice(-4);
  return `REQ${year}${month}${day}${time}`;
};