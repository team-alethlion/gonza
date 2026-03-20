import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquare } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";

interface SaleSMSSectionProps {
  userId: string | undefined;
  customerName: string;
  customerContact: string;
  businessName: string;
  businessPhone: string;
  sendSMS: boolean;
  onSendSMSChange: (checked: boolean) => void;
  smsMessage: string;
  onSMSMessageChange: (message: string) => void;
}

export const SaleSMSSection: React.FC<SaleSMSSectionProps> = ({
  userId,
  customerName,
  customerContact,
  businessName,
  businessPhone,
  sendSMS,
  onSendSMSChange,
  smsMessage,
  onSMSMessageChange,
}) => {
  const { templates = [], isLoading: templatesLoading } = useMessages(userId);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("default");

  const DEFAULT_TEMPLATE = "Thank you for your purchase from {business_name} We truly appreciate your support and trust in our Business. If you need any assistance or have any questions about your order, please feel free to reach out, on {business_number} We look forward to serving you again!";

  const fillTemplate = (template: string, name: string) => {
    let result = template;
    if (name) {
      result = result
        .replace(/\{customer_name\}/gi, name)
        .replace(/\{first_name\}/gi, name.split(" ")[0] || "")
        .replace(/\{last_name\}/gi, name.split(" ").slice(1).join(" ") || "");
    }
    result = result
      .replace(/\{business_name\}/gi, businessName || "[Business Name]")
      .replace(/\{business_number\}/gi, businessPhone || "[Business Number]");
    return result;
  };

  const thankYouTemplates = useMemo(() => {
    return templates.filter(
      (t) => t.category && String(t.category).trim() === "ThankYou"
    );
  }, [templates]);

  useEffect(() => {
    if (!sendSMS) return;

    let templateToUse = DEFAULT_TEMPLATE;
    if (selectedTemplateId !== 'default') {
      const tpl = thankYouTemplates.find((t) => t.id === selectedTemplateId);
      if (tpl) templateToUse = tpl.content;
    }

    const filled = fillTemplate(templateToUse, customerName);
    if (smsMessage !== filled) {
      onSMSMessageChange(filled);
    }
  }, [sendSMS, customerName, selectedTemplateId, thankYouTemplates, businessName, businessPhone]);

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    let content = DEFAULT_TEMPLATE;
    if (id !== 'default') {
      const tpl = thankYouTemplates.find((t) => t.id === id);
      if (tpl) content = tpl.content;
    }
    onSMSMessageChange(fillTemplate(content, customerName));
  };

  const customerHasPhone = !!customerContact;

  return (
    <Card className={`border-blue-200 shadow-sm ${sendSMS ? "bg-blue-50/50" : "bg-gray-50"}`}>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="sendSMS"
            checked={sendSMS}
            onCheckedChange={onSendSMSChange}
            disabled={!customerHasPhone}
          />
          <div className="flex-1">
            <Label htmlFor="sendSMS" className="text-base font-medium flex items-center gap-2 cursor-pointer">
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
          <div className="space-y-4 pl-8 border-l-4 border-blue-300 bg-blue-50/30 -m-4 p-4 rounded-r-lg mt-4">
            <div>
              <Label className="text-sm font-medium">Template</Label>
              {templatesLoading ? (
                <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading templates...
                </div>
              ) : (
                <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue placeholder="Choose a thank you template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Template</SelectItem>
                    {thankYouTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Message</Label>
              <Textarea
                value={smsMessage}
                onChange={(e) => onSMSMessageChange(e.target.value)}
                placeholder="Your message will appear here..."
                rows={4}
                className="mt-1 resize-none text-sm font-medium bg-white"
              />
              <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
                <span>{smsMessage.length} characters</span>
                <span className="font-semibold text-blue-600">
                  {Math.ceil(smsMessage.length / 160) || 1} SMS credits
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
