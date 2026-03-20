"use client";

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FileText, X } from 'lucide-react';

interface DraftNotificationProps {
  onLoadDraft: () => void;
  onDismiss: () => void;
  savedAt: Date;
}

const DraftNotification: React.FC<DraftNotificationProps> = ({
  onLoadDraft,
  onDismiss,
  savedAt
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50">
      <FileText className="h-4 w-4 text-blue-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <span className="text-blue-800 font-medium">Draft found!</span>
          <span className="text-blue-700 ml-2">
            Saved on {formatTime(savedAt)}
          </span>
        </div>
        <div className="flex gap-2 ml-4">
          <Button
            size="sm"
            onClick={onLoadDraft}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Load Draft
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default DraftNotification;
