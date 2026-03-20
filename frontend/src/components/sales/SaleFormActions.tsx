"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, Printer } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { checkBridgeStatus } from "@/utils/thermalPrinterPlug";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface SaleFormActionsProps {
  loading: boolean;
  isEditing: boolean;
  onCancel: () => void;
  onClearForm?: () => void;
  printAfterSave: boolean;
  onPrintAfterSaveChange: (checked: boolean) => void;
  thermalPrintAfterSave?: boolean;
  onThermalPrintAfterSaveChange?: (checked: boolean) => void;
  paymentStatus: string;
  includePaymentInfo: boolean;
  onIncludePaymentInfoChange: (checked: boolean) => void;
  hasPendingPaymentChanges?: boolean;

  sendSMS?: boolean;
  onSendSMSChange?: (checked: boolean) => void;
  smsMessage?: string;
  onSMSMessageChange?: (message: string) => void;
  customerName?: string;
  customerHasPhone?: boolean;
  disabled?: boolean;
}

const SaleFormActions: React.FC<SaleFormActionsProps> = ({
  loading,
  isEditing,
  onCancel,
  onClearForm,
  printAfterSave,
  onPrintAfterSaveChange,
  thermalPrintAfterSave = false,
  onThermalPrintAfterSaveChange,
  paymentStatus,
  includePaymentInfo,
  onIncludePaymentInfoChange,
  hasPendingPaymentChanges = false,
  sendSMS = false,
  onSendSMSChange,
  smsMessage = "",
  onSMSMessageChange,
  customerName = "",
  customerHasPhone = false,
  disabled = false,
}) => {
  const { user } = useAuth();
  const userId = user?.id;
  const { currentBusiness } = useBusiness();
  const { settings } = useBusinessSettings();
  const [isBridgeOnline, setIsBridgeOnline] = useState(false);

  const { templates = [], isLoading: templatesLoading } = useMessages(userId);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  useEffect(() => {
    const checkBridge = async () => {
      const isOnline = await checkBridgeStatus();
      setIsBridgeOnline(isOnline);
    };
    checkBridge();
  }, []);

  const FALLBACK_PLACEHOLDER =
    "Thank you for your purchase, {customer_name}! We appreciate your business.";

  // Comprehensive default template
  // Comprehensive default template
  const DEFAULT_TEMPLATE = "Thank you for your purchase from {business_name} We truly appreciate your support and trust in our Business. If you need any assistance or have any questions about your order, please feel free to reach out, on {business_number} We look forward to serving you again!";

  // --- Utility function moved up ---
  const fillTemplate = (template: string, name: string) => {
    let result = template;
    if (name) {
      result = result
        .replace(/\{customer_name\}/gi, name)
        .replace(/\{first_name\}/gi, name.split(" ")[0] || "")
        .replace(/\{last_name\}/gi, name.split(" ").slice(1).join(" ") || "");
    }
    // Replace business placeholders
    result = result
      .replace(/\{business_name\}/gi, currentBusiness?.name || "[Business Name]")
      .replace(/\{business_number\}/gi, settings.businessPhone || "[Business Number]");
    return result;
  };

  // Filter ThankYou templates
  const thankYouTemplates = useMemo(() => {
    return templates.filter(
      (t) => t.category && String(t.category).trim() === "ThankYou"
    );
  }, [templates]);

  // --- Unified effect for template auto-fill ---
  useEffect(() => {
    const syncTemplate = () => {
      if (!sendSMS || !onSMSMessageChange) return;

      let templateToUse = DEFAULT_TEMPLATE;

      // Handle template selection
      if (selectedTemplateId === 'default') {
        templateToUse = DEFAULT_TEMPLATE;
      } else if (selectedTemplateId && thankYouTemplates.length > 0) {
        const tpl = thankYouTemplates.find((t) => t.id === selectedTemplateId);
        if (tpl) {
          templateToUse = tpl.content;
        }
      } else if (!selectedTemplateId) {
        // Auto-set to default
        setSelectedTemplateId('default');
        return;
      }

      const filledMessage = fillTemplate(templateToUse, customerName);
      if (smsMessage !== filledMessage) {
        onSMSMessageChange(filledMessage);
      }
    };

    const timer = setTimeout(syncTemplate, 0);
    return () => clearTimeout(timer);
  }, [
    sendSMS,
    customerName,
    thankYouTemplates,
    selectedTemplateId,
    onSMSMessageChange,
    smsMessage
  ]);

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);

    let templateContent = DEFAULT_TEMPLATE;
    if (id === 'default') {
      templateContent = DEFAULT_TEMPLATE;
    } else {
      const tpl = thankYouTemplates.find((t) => t.id === id);
      if (tpl) {
        templateContent = tpl.content;
      }
    }

    const filled = fillTemplate(templateContent, customerName);
    onSMSMessageChange?.(filled);
  };

  const messageLength = smsMessage.length;
  const smsCredits = Math.ceil(messageLength / 160) || 1;

  return (
    <div className="space-y-4">
      {/* Print & Payment Options */}
      <Card className="border-gray-200">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="printAfterSave"
              checked={printAfterSave}
              onCheckedChange={onPrintAfterSaveChange}
            />
            <Label className="text-sm">
              Show receipt after {isEditing ? "updating" : "creating"} sale
            </Label>
          </div>

          {isBridgeOnline && onThermalPrintAfterSaveChange && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="thermalPrintAfterSave"
                checked={thermalPrintAfterSave}
                onCheckedChange={onThermalPrintAfterSaveChange}
              />
              <Label className="text-sm flex items-center gap-1.5 text-green-700 font-medium">
                <Printer className="w-3.5 h-3.5" />
                Auto-print (Thermal Bridge)
              </Label>
            </div>
          )}

          {(paymentStatus === "Paid" || paymentStatus === "Installment Sale") && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includePaymentInfo"
                checked={includePaymentInfo}
                onCheckedChange={onIncludePaymentInfoChange}
              />
              <Label className="text-sm">
                Include payment information in receipt
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SMS Section */}
      {onSendSMSChange && onSMSMessageChange && (
        <Card
          className={`border-blue-200 ${sendSMS ? "bg-blue-50/50" : "bg-gray-50"
            }`}
        >
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="sendSMS"
                checked={sendSMS}
                onCheckedChange={onSendSMSChange}
                disabled={!customerHasPhone}
              />
              <div className="flex-1">
                <Label className="text-base font-medium flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Send Thank You SMS
                </Label>
                {!customerHasPhone && (
                  <p className="text-xs text-amber-600 mt-1">
                    Customer phone number required to send SMS
                  </p>
                )}
              </div>
            </div>

            {sendSMS && customerHasPhone && (
              <div className="space-y-4 pl-8 border-l-4 border-blue-300 bg-blue-50/30 -m-4 p-4 rounded-r-lg">
                {/* Template Selector */}
                <div>
                  <Label className="text-sm font-medium">Template</Label>
                  {templatesLoading ? (
                    <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading templates...
                    </div>
                  ) : (
                    <Select
                      value={selectedTemplateId || "default"}
                      onValueChange={handleTemplateChange}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose a thank you template..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">
                          Default Template
                        </SelectItem>
                        {thankYouTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Message */}
                <div>
                  <Label className="text-sm font-medium">Message</Label>
                  <Textarea
                    value={smsMessage}
                    onChange={(e) => onSMSMessageChange?.(e.target.value)}
                    placeholder="Your message will appear here..."
                    rows={4}
                    className="mt-1 resize-none text-sm font-medium"
                  />
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
                    <span>{messageLength} characters</span>
                    <span className="font-semibold text-blue-600">
                      {smsCredits} SMS credit{smsCredits > 1 ? "s" : ""} will
                      be used
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rest of your buttons */}
      {hasPendingPaymentChanges && (
        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
          Pending payment changes will be applied when updating.
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
        {!isEditing && onClearForm && (
          <Button
            type="button"
            variant="outline"
            onClick={onClearForm}
            disabled={loading}
            className="flex-1"
          >
            Clear Form
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || disabled}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? "Updating..." : "Creating..."}
            </>
          ) : isEditing ? (
            "Update Sale"
          ) : (
            "Create Sale"
          )}
        </Button>
      </div>
    </div>
  );
};

export default SaleFormActions;
