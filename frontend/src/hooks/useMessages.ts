/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useMessages.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useProfiles } from '@/contexts/ProfileContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  getMessagesAction,
  createMessageAction,
  getMessageTemplatesAction,
  createMessageTemplateAction,
  updateMessageTemplateAction,
  deleteMessageTemplateAction,
  getMessagingStatsAction,
  bulkSendMessagesAction
} from '@/app/actions/messaging';

export interface Message {
  id: string;
  userId: string;
  locationId: string;
  profileId?: string;
  customerId?: string;
  phoneNumber: string;
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  smsCreditsUsed: number;
  templateId?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

export interface MessageTemplate {
  id: string;
  userId: string;
  locationId: string;
  name: string;
  content: string;
  category: string | null;
  variables: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  userId: string;
  locationId: string;
  profileId?: string;
  creditsAmount: number;
  totalCost: number;
  paymentPhoneNumber: string;
  paymentStatus: string;
  pesapalTrackingId?: string;
  pesapalMerchantReference?: string;
  pesapalRedirectUrl?: string;
  paymentMethod?: string;
  paymentCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('256')) return '+' + cleaned;
  if (cleaned.startsWith('0')) return '+256' + cleaned.substring(1);
  if (cleaned.length === 9 && cleaned.match(/^[7]\d{8}$/)) return '+256' + cleaned;
  return '+256' + cleaned;
};

import { localDb } from '@/lib/dexie';

export const useMessages = (userId?: string, initialMessages: Message[] = [], initialTemplates: MessageTemplate[] = []) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [liveCredits, setLiveCredits] = useState<number>(0);

  const { currentBusiness } = useBusiness();
  const { currentProfile } = useProfiles();
  const queryClient = useQueryClient();

  const messagesQueryKey = useMemo(() => ['messages', userId, currentBusiness?.id], [userId, currentBusiness?.id]);
  const templatesQueryKey = useMemo(() => ['message_templates', userId, currentBusiness?.id], [userId, currentBusiness?.id]);

  const fetchMessages = useCallback(async (): Promise<Message[]> => {
    if (!userId || !currentBusiness?.id) return [];
    try {
      const result = await getMessagesAction(userId, currentBusiness.id);
      if (result.success && result.data) {
        const fetchedMessages = result.data as Message[];
        
        // Update Dexie cache in the background
        if (fetchedMessages.length > 0) {
          const cacheData = fetchedMessages.map(m => ({
            ...m,
            locationId: currentBusiness.id as string
          }));
          localDb.messages.where('locationId').equals(currentBusiness.id).delete().then(() => {
             localDb.messages.bulkPut(cacheData as any);
          });
        }
        
        return fetchedMessages;
      }
      return [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }, [userId, currentBusiness?.id]);

  const { data: queriedMessages, isLoading: messagesLoading } = useQuery({
    queryKey: messagesQueryKey,
    queryFn: fetchMessages,
    enabled: !!userId && !!currentBusiness?.id,
    staleTime: 60 * 1000, // 1 minute
  });

  const messages = queriedMessages || [];

  const { data: queriedTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: templatesQueryKey,
    queryFn: async () => {
      if (!userId || !currentBusiness?.id) return [];
      const result = await getMessageTemplatesAction(userId, currentBusiness.id);
      if (!result.success || !result.data) throw new Error(result.error || 'Failed');
      return result.data;
    },
    enabled: !!userId && !!currentBusiness?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes is safer
  });

  const templates = queriedTemplates || [];

  const fetchLiveCredits = async () => {
    if (currentProfile?.sms_credits !== undefined) {
      setLiveCredits(currentProfile.sms_credits);
    }
  };

  const createTemplate = async (templateData: Omit<MessageTemplate, 'id' | 'userId' | 'locationId' | 'createdAt' | 'updatedAt'>) => {
    if (!userId || !currentBusiness?.id) return null;

    try {
      const result = await createMessageTemplateAction({
        userId,
        locationId: currentBusiness.id,
        name: templateData.name,
        content: templateData.content,
        category: templateData.category,
        variables: templateData.variables,
        isDefault: templateData.isDefault
      });

      if (result.success && result.data) {
        queryClient.invalidateQueries({ queryKey: templatesQueryKey });
        return result.data;
      }
      throw new Error(result.error);
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast({ title: 'Error', description: 'Failed to create template', variant: 'destructive' });
      return null;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<MessageTemplate>) => {
    try {
      const result = await updateMessageTemplateAction(id, updates);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: templatesQueryKey });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast({ title: 'Error', description: 'Failed to update template', variant: 'destructive' });
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const result = await deleteMessageTemplateAction(id);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: templatesQueryKey });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
    }
  };

  const fetchPurchases = async () => {
    // Placeholder - implement when billing is migrated
    setPurchases([]);
  };

  const createMessage = async (messageData: { phoneNumber: string; content: string; customerId?: string; templateId?: string; channel?: 'sms' | 'whatsapp'; metadata?: any }) => {
    if (!userId || !currentBusiness?.id || !currentProfile) return null;

    const formattedPhone = formatPhoneNumber(messageData.phoneNumber);
    const creditsNeeded = Math.ceil(messageData.content.length / 160);
    const channel = messageData.channel || 'sms';

    // Basic credit check before calling action
    if (currentProfile.sms_credits < creditsNeeded) {
      toast({ title: 'Error', description: 'Insufficient credits', variant: 'destructive' });
      return null;
    }

    try {
      const result = await createMessageAction({
        userId,
        locationId: currentBusiness.id,
        profileId: currentProfile.id,
        customerId: messageData.customerId,
        phoneNumber: formattedPhone,
        content: messageData.content,
        templateId: messageData.templateId,
        smsCreditsUsed: creditsNeeded,
        channel: channel,
        metadata: messageData.metadata
      });

      if (result.success && result.data) {
        // Backend returns { success: bool, message: data, error: str }
        const actualSuccess = result.data.success !== false;
        const msgData = result.data.message || result.data;
        
        // No need to manually update state when using react-query for the source of truth
        if (actualSuccess) {
            queryClient.invalidateQueries({ queryKey: messagesQueryKey });
            toast({ title: 'Success', description: 'Message sent successfully' });
            return { success: 1, failed: 0, errors: [] };
        } else {
            const errorMsg = result.data.error || 'Gateway rejected message';
            toast({ title: 'Gateway Error', description: errorMsg, variant: 'destructive' });
            return { success: 0, failed: 1, errors: [errorMsg] };
        }
      }
      throw new Error(result.error || 'API Error');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({ title: 'Error', description: error.message || 'Failed to send message', variant: 'destructive' });
      return { success: 0, failed: 1, errors: [error.message] };
    }
  };

  const createBulkMessages = async (data: { customerIds: string[]; content?: string; templateId?: string; channel?: 'sms' | 'whatsapp' }) => {
    if (!userId || !currentBusiness?.id) return { success: 0, failed: 0, errors: ['Context missing'] };

    try {
      const result = await bulkSendMessagesAction({
        locationId: currentBusiness.id,
        customerIds: data.customerIds,
        content: data.content,
        templateId: data.templateId,
        channel: data.channel
      });

      if (result.success) {
        toast({ title: 'Success', description: `Bulk message job queued for ${data.customerIds.length} customers` });
        // Invalidate stats as they will change
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        return { success: data.customerIds.length, failed: 0, errors: [] };
      }
      throw new Error(result.error);
    } catch (error: any) {
      console.error('Bulk send error:', error);
      toast({ title: 'Error', description: 'Failed to start bulk messaging job', variant: 'destructive' });
      return { success: 0, failed: data.customerIds.length, errors: [error.message] };
    }
  };

  const initiateCreditPurchase = async (creditsAmount: number, phoneNumber: string) => {
    toast({ title: 'Info', description: 'Credit purchase migration in progress' });
    return null;
  };

  useEffect(() => {
    if (userId && currentBusiness?.id) {
      fetchPurchases();
      fetchLiveCredits();
    }
  }, [userId, currentBusiness?.id, currentProfile?.id]);

  const isLoading = (messagesLoading && !queriedMessages) || (templatesLoading && !queriedTemplates);

  const { data: statsData } = useQuery({
    queryKey: ['messaging_stats', currentBusiness?.id],
    queryFn: async () => {
        if (!currentBusiness?.id) return null;
        const result = await getMessagingStatsAction(currentBusiness.id);
        return result.success ? result.data : null;
    },
    enabled: !!currentBusiness?.id,
    staleTime: 30_000,
  });

  const getMessageStats = () => {
    if (statsData) {
        return {
            total: statsData.total || 0,
            sent: statsData.sent || 0,
            failed: statsData.failed || 0,
            pending: statsData.pending || 0,
            totalCreditsUsed: statsData.credits_used || 0,
            creditsRemaining: statsData.credits_remaining || 0
        };
    }

    const total = messages.length;
    const sent = messages.filter(m => m.status === 'sent' || m.status === 'delivered').length;
    const failed = messages.filter(m => m.status === 'failed').length;
    const pending = messages.filter(m => m.status === 'pending').length;
    const totalCreditsUsed = messages.reduce((sum, m) => sum + m.smsCreditsUsed, 0);

    return { total, sent, failed, pending, totalCreditsUsed, creditsRemaining: liveCredits };
  };

  return {
    messages,
    templates,
    purchases,
    liveCredits,
    isLoading,
    createMessage,
    createBulkMessages,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getMessageStats,
    initiateCreditPurchase,
    refresh: () => { 
      queryClient.invalidateQueries({ queryKey: messagesQueryKey }); 
      queryClient.invalidateQueries({ queryKey: templatesQueryKey }); 
      fetchPurchases(); 
      fetchLiveCredits(); 
    }
  };
};
