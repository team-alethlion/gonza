import { logActivityAction, ActivityLogInput } from '@/app/actions/activity';
import { useCurrentUser } from './useCurrentUser';
import { useBusiness } from '@/contexts/BusinessContext';
import { useProfiles } from '@/contexts/ProfileContext';

export type ActivityType = 'CREATE' | 'UPDATE' | 'DELETE';
export type ModuleType = 'SALES' | 'INVENTORY' | 'EXPENSES' | 'FINANCE' | 'CUSTOMERS' | 'TASKS';

export interface ActivityLogData {
  activityType: ActivityType;
  module: ModuleType;
  entityType: string;
  entityId?: string;
  entityName: string;
  description: string;
  metadata?: any;
}

export const useActivityLogger = () => {
  const { userId } = useCurrentUser();
  const { currentBusiness } = useBusiness();

  // Safely get current profile, handle case where ProfileProvider isn't available
  let currentProfile = null;
  try {
    const { currentProfile: profile } = useProfiles();
    currentProfile = profile;
  } catch {
    // ProfileProvider not available, continue without profile
    currentProfile = null;
  }

  const logActivity = async (data: ActivityLogData) => {
    if (!userId || !currentBusiness?.id) {
      console.warn('Cannot log activity: missing user or business context');
      return;
    }

    try {
      const result = await logActivityAction({
        userId: userId,
        locationId: currentBusiness.id,
        activityType: data.activityType as any,
        module: data.module as any,
        entityType: data.entityType,
        entityId: data.entityId || undefined,
        entityName: data.entityName,
        description: data.description,
        metadata: data.metadata || undefined,
        profileId: currentProfile?.id || undefined,
        profileName: currentProfile?.profile_name || undefined
      });

      if (!result.success) {
        console.error('Error logging activity:', result.error);
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  return { logActivity };
};