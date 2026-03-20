"use client";
import React from 'react';
import { MessageSquare, Plus, FileText, Zap, CreditCard, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageHeaderProps {
  onNewMessage: () => void;
  onNewTemplate: () => void;
  onTopUp: () => void;
  onBulkMessage: () => void;
  smsCredits: number;
  canCreate?: boolean;
}

const MessageHeader: React.FC<MessageHeaderProps> = ({
  onNewMessage,
  onNewTemplate,
  onTopUp,
  onBulkMessage,
  smsCredits,
  canCreate = true
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-8 h-8 text-blue-600" />
          Messages
        </h1>
        <p className="text-gray-500 mt-1">Send SMS to your customers</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canCreate && (
          <>
            <Button
              onClick={onTopUp}
              variant="outline"
              className="flex items-center gap-2 border-green-500 text-green-700 hover:bg-green-50"
            >
              <CreditCard className="w-4 h-4" />
              Top Up
            </Button>

            <Button
              onClick={onNewTemplate}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              New Template
            </Button>

            <Button
              onClick={onBulkMessage}
              variant="outline"
              className="flex items-center gap-2 border-purple-500 text-purple-700 hover:bg-purple-50"
            >
              <Users className="w-4 h-4" />
              Bulk SMS
            </Button>

            <Button
              onClick={onNewMessage}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Message
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageHeader;