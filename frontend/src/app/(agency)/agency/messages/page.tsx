"use client";

import React, { useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBusiness } from "@/contexts/BusinessContext";
import {
  useMessages,
  Message,
  MessageTemplate,
  Purchase,
} from "@/hooks/useMessages";
import { useCustomers } from "@/hooks/useCustomers";
import { useProfiles } from "@/contexts/ProfileContext";
import MessageHeader from "@/components/messages/MessageHeader";
import MessageStatsCards from "@/components/messages/MessageStatsCards";
import MessageContent from "@/components/messages/MessageContent";
import NewMessageDialog from "@/components/messages/NewMessageDialog";
import MessageTemplateDialog from "@/components/messages/MessageTemplateDialog";
import TopUpCreditsDialog from "@/components/messages/TopUpCreditsDialog";
import BulkMessageDialog from "@/components/messages/BulkMessageDialog";
import PurchaseHistoryTable from "@/components/messages/PurchaseHistoryTable";
import UsageHistoryTable from "@/components/messages/UsageHistoryTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const Messages = () => {
  const { user } = useAuth();
  const { currentBusiness, isLoading: businessLoading } = useBusiness();
  const {
    currentProfile,
    hasPermission,
    isLoading: profilesLoading,
  } = useProfiles();
  const router = useRouter();

  // Permissions
  const canView = hasPermission("messages", "view");
  const canCreate = hasPermission("messages", "create");
  const canEdit = hasPermission("messages", "edit");
  const canDelete = hasPermission("messages", "delete");
  const {
    messages,
    templates,
    purchases,
    isLoading,
    createMessage,
    createBulkMessages,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    initiateCreditPurchase,
    getMessageStats,
  } = useMessages(user?.id);

  const { customers } = useCustomers();

  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [bulkMessageOpen, setBulkMessageOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    MessageTemplate | undefined
  >(undefined);
  const [activeTab, setActiveTab] = useState("messages");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const stats = getMessageStats();

  const handleSendMessage = async (messageData: {
    phoneNumber: string;
    content: string;
    customerId?: string;
    templateId?: string;
  }) => {
    try {
      await createMessage(messageData);
      return { success: 1, failed: 0, errors: [] };
    } catch (error) {
      console.error("Failed to send message:", error);
      return {
        success: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  };

  const handleBulkSend = useCallback(
    async (data: {
      customerIds: string[];
      content: string;
      templateId?: string;
    }) => {
      try {
        const result = await createBulkMessages(data);
        return result;
      } catch (error) {
        console.error("Failed to send bulk messages:", error);
        alert(
          error instanceof Error ? error.message : "Failed to send messages",
        );
        return {
          success: 0,
          failed: 0,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        };
      }
    },
    [createBulkMessages],
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

  const handleTopUpCredits = useCallback(
    async (credits: number, phoneNumber: string) => {
      try {
        const result = (await initiateCreditPurchase(
          credits,
          phoneNumber,
        )) as unknown as { redirectUrl?: string };
        if (result?.redirectUrl) {
          // Redirect to payment page
          window.open(result.redirectUrl, "_blank");
        }
        setTopUpOpen(false);
        return true;
      } catch (error) {
        console.error("Failed to initiate top-up:", error);
        alert(
          error instanceof Error ? error.message : "Failed to initiate payment",
        );
        return false;
      }
    },
    [initiateCreditPurchase],
  );

  if (businessLoading || !currentBusiness || isLoading || profilesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view the messaging module. Please
            contact your administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const filteredMessages = messages.filter((msg) => {
    const phone = msg.phoneNumber || "";
    const text = msg.content || "";
    const matchesSearch =
      phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || msg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <MessageHeader
        onNewMessage={() => setNewMessageOpen(true)}
        onNewTemplate={() => {
          setSelectedTemplate(undefined);
          setNewTemplateOpen(true);
        }}
        onTopUp={() => setTopUpOpen(true)}
        onBulkMessage={() => setBulkMessageOpen(true)}
        smsCredits={currentProfile?.sms_credits || 0}
        canCreate={canCreate}
      />

      {/* Stats Cards */}
      <MessageStatsCards stats={stats} />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4 mt-6">
          <MessageContent
            messages={filteredMessages}
            customers={customers}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
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

      <TopUpCreditsDialog
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        onTopUp={handleTopUpCredits}
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
        onSend={handleBulkSend}
        customers={customers}
        templates={templates}
        searchTerm={searchTerm} // reuse parent searchTerm
        setSearchTerm={setSearchTerm} // reuse parent setter
      />
    </div>
  );
};

export default Messages;
