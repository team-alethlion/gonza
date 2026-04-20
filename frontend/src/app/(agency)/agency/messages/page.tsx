/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBusiness } from "@/contexts/BusinessContext";
import {
  useMessages,
  Message,
  MessageTemplate,
} from "@/hooks/useMessages";
import { useProfiles } from "@/contexts/ProfileContext";
import { useCustomers } from "@/hooks/useCustomers";
import MessageHeader from "@/components/messages/MessageHeader";
import MessageStatsCards from "@/components/messages/MessageStatsCards";
import MessageContent from "@/components/messages/MessageContent";
import NewMessageDialog from "@/components/messages/NewMessageDialog";
import MessageTemplateDialog from "@/components/messages/MessageTemplateDialog";
import TopUpDialog from "@/components/messages/TopUpDialog";
import BulkMessageDialog from "@/components/messages/BulkMessageDialog";
import WhatsAppConnection from "@/components/messages/WhatsAppConnection";
import PurchaseHistoryTable from "@/components/messages/PurchaseHistoryTable";
import UsageHistoryTable from "@/components/messages/UsageHistoryTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const Messages = () => {
  const { user } = useAuth();
  const { currentBusiness, isLoading: businessLoading } = useBusiness();
  const { currentProfile, isLoading: profilesLoading } = useProfiles();
  const router = useRouter();

  const {
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
    refresh,
  } = useMessages(user?.id);

  const { customers } = useCustomers();

  const [activeTab, setActiveTab] = useState("messages");
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [bulkMessageOpen, setBulkMessageOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    MessageTemplate | undefined
  >(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const stats = getMessageStats();

  // Safely get role name from either string or object
  const getRoleName = () => {
    if (!currentProfile) return "";
    if (currentProfile.business_role?.name) return currentProfile.business_role.name.toLowerCase();
    if (typeof currentProfile.role === 'object') return (currentProfile.role as any)?.name?.toLowerCase() || "";
    return String(currentProfile.role).toLowerCase();
  };

  const roleName = getRoleName();
  const canCreate = roleName !== "staff";
  const canEdit = roleName === "admin" || roleName === "owner";
  const canDelete = roleName === "admin" || roleName === "owner";

  const handleSendMessage = useCallback(
    async (messageData: { 
      phoneNumber: string; 
      content: string; 
      customerId?: string; 
      templateId?: string; 
      channel: any 
    }) => {
      const result = await createMessage(messageData);
      if (result && result.success > 0) {
        setNewMessageOpen(false);
        refresh();
      }
      return result || { success: 0, failed: 1, errors: ["Failed to send"] };
    },
    [createMessage, refresh],
  );

  const handleSendBulkMessages = useCallback(
    async (data: {
      customerIds: string[];
      content: string;
      templateId?: string;
      channel: "sms" | "whatsapp";
    }) => {
      try {
        const result = await createBulkMessages(data);
        refresh();
        return result;
      } catch (error) {
        console.error("Failed to send bulk messages:", error);
        return {
          success: 0,
          failed: data.customerIds.length,
          errors: [error instanceof Error ? error.message : "Failed to send"],
        };
      }
    },
    [createBulkMessages, refresh],
  );

  const handleSaveTemplate = useCallback(
    async (
      templateData: Omit<
        MessageTemplate,
        "id" | "userId" | "locationId" | "createdAt" | "updatedAt"
      >,
    ) => {
      if (selectedTemplate) {
        await updateTemplate(selectedTemplate.id, templateData);
      } else {
        await createTemplate(templateData);
      }
      setNewTemplateOpen(false);
      setSelectedTemplate(undefined);
      return true;
    },
    [selectedTemplate, updateTemplate, createTemplate],
  );

  const handleEditTemplate = useCallback((template: MessageTemplate) => {
    setSelectedTemplate(template);
    setNewTemplateOpen(true);
  }, []);

  const handleDeleteTemplate = useCallback(
    async (templateId: string) => {
      if (confirm("Are you sure you want to delete this template?")) {
        await deleteTemplate(templateId);
      }
    },
    [deleteTemplate],
  );

  if (businessLoading || !currentBusiness || isLoading || profilesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>

      <MessageHeader
        onNewMessage={() => setNewMessageOpen(true)}
        onNewTemplate={() => {
          setSelectedTemplate(undefined);
          setNewTemplateOpen(true);
        }}
        onTopUp={() => setTopUpOpen(true)}
        onBulkMessage={() => setBulkMessageOpen(true)}
        smsCredits={liveCredits}
        canCreate={canCreate}
      />

      {/* Stats Cards */}
      <MessageStatsCards stats={stats} />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4 mt-6">
          <MessageContent
            messages={messages}
            customers={customers}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template: MessageTemplate) => (              <div
                key={template.id}
                className="bg-white p-4 rounded-lg shadow border hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  <div className="flex gap-2">
                    {canEdit && (
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="text-blue-600 hover:text-blue-800 text-sm">
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-800 text-sm">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                {template.category && (
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {template.category}
                  </span>
                )}
                <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                  {template.content}
                </p>
                {template.variables.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {template.variables.map((v: string) => (
                      <span
                        key={v}
                        className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4 mt-6">
          <WhatsAppConnection />
        </TabsContent>

        <TabsContent value="history" className="space-y-6 mt-6">
          <PurchaseHistoryTable purchases={purchases} />
          <UsageHistoryTable messages={messages} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <MessageTemplateDialog
        open={newTemplateOpen}
        onClose={() => {
          setNewTemplateOpen(false);
          setSelectedTemplate(undefined);
        }}
        onSave={handleSaveTemplate}
        initialData={selectedTemplate}
      />

      <TopUpDialog
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
      />

      <NewMessageDialog
        open={newMessageOpen}
        onClose={() => setNewMessageOpen(false)}
        onSend={handleSendMessage}
        customers={customers}
        templates={templates}
      />

      <BulkMessageDialog
        open={bulkMessageOpen}
        onClose={() => setBulkMessageOpen(false)}
        onSend={handleSendBulkMessages}
        templates={templates}
      />
    </div>
  );
};

export default Messages;
