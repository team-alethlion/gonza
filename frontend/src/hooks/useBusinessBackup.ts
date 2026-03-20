
import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';
import { getBusinessBackupDataAction } from '@/app/actions/expenses';

interface BackupMetadata {
  version: string;
  timestamp: string;
  businessName: string;
  businessId: string;
  exportType: 'full_backup';
}

interface BackupData {
  metadata: BackupMetadata;
  data: Record<string, any[]>;
}

export const useBusinessBackup = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();

  const exportBusinessData = async () => {
    if (!user || !currentBusiness) {
      toast.error('No business selected for backup');
      return;
    }

    setIsExporting(true);
    setProgress(10);

    try {
      const result = await getBusinessBackupDataAction(user.id, currentBusiness.id);

      if (!result.success) {
        throw new Error(result.error || 'Export failed');
      }

      setProgress(90);

      const backupData: BackupData = {
        metadata: {
          version: '1.0',
          timestamp: new Date().toISOString(),
          businessName: currentBusiness.name,
          businessId: currentBusiness.id,
          exportType: 'full_backup',
        },
        data: result.data as Record<string, any[]>,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentBusiness.name.replace(/[^a-zA-Z0-9]/g, '_')}_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(100);
      toast.success('Backup completed successfully');
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Backup failed. Please try again.');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const importBusinessData = async (_file: File): Promise<boolean> => {
    toast.error('Data import is not yet supported with the new Prisma backend. Please contact support.');
    return false;
  };

  return {
    exportBusinessData,
    importBusinessData,
    isExporting,
    isImporting,
    progress,
  };
};