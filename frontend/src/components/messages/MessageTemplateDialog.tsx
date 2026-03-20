"use client";
import React, { useState, useEffect } from 'react';
import { FileText, Save } from 'lucide-react';
import { MessageTemplate } from '@/hooks/useMessages';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';

interface MessageTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<MessageTemplate, 'id' | 'userId' | 'locationId' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  initialData?: MessageTemplate;
}

// Predefined SMS Categories with Custom option
const TEMPLATE_CATEGORIES = [
  { value: "ThankYou", label: "Thank You (After Sale)" },
  { value: "Birthday", label: "Birthday Wishes" },
  { value: "PaymentReminder", label: "Payment Reminder" },
  { value: "Holiday", label: "Public Holiday" },
  { value: "Inactive", label: "We Miss You / Inactive Customer" },
  { value: "Custom", label: "Custom" } // Custom option
];

const MessageTemplateDialog = ({ open, onClose, onSave, initialData }: MessageTemplateDialogProps) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState(''); // For typing custom category
  const [variables, setVariables] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const syncData = () => {
      if (open && initialData) {
        if (name !== initialData.name) setName(initialData.name);
        if (content !== initialData.content) setContent(initialData.content);
        const initialCategory = initialData.category || '';
        if (category !== initialCategory) setCategory(initialCategory);
        
        const derivedCustomCategory = initialData.category && !TEMPLATE_CATEGORIES.some(c => c.value === initialData.category) ? initialData.category : '';
        if (customCategory !== derivedCustomCategory) setCustomCategory(derivedCustomCategory);
        
        if (JSON.stringify(variables) !== JSON.stringify(initialData.variables || [])) {
          setVariables(initialData.variables || []);
        }
      } else if (!open) {
        if (name !== '') setName('');
        if (content !== '') setContent('');
        if (category !== '') setCategory('');
        if (customCategory !== '') setCustomCategory('');
        if (variables.length > 0) setVariables([]);
      }
    };

    const timer = setTimeout(syncData, 0);
    return () => clearTimeout(timer);
  }, [open, initialData, name, content, category, customCategory, variables]);

  const handleSave = async () => {
    if (!name || !content) return;

    const finalCategory = category === "Custom" ? customCategory : category;

    setIsSaving(true);
    const success = await onSave({
      name,
      content,
      category: finalCategory || null,
      variables,
      isDefault: false
    });
    setIsSaving(false);

    if (success) {
      onClose();
    }
  };

  const extractVariables = (text: string) => {
    const regex = /\{([^}]+)\}/g;
    const matches = text.match(regex);
    if (matches) {
      const vars = matches.map(m => m.slice(1, -1));
      setVariables([...new Set(vars)]);
    } else {
      setVariables([]);
    }
  };

  return (
    <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
      >
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {initialData ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Template Name *
            </label>
            <Textarea
              placeholder="e.g., Welcome Message"
              value={name}
              onChange={(e) => setName(e.target.value)}
              rows={1}
              className="resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Category *
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {category === "Custom" && (
              <Textarea
                placeholder="Type custom category..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                rows={1}
                className="mt-2 resize-none"
              />
            )}
          </div>

          {/* Template Content */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Message Content *
            </label>
            <Textarea
              placeholder="Type your template here... Use {variable} for dynamic content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                extractVariables(e.target.value);
              }}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use curly braces for variables: {'{customer_name}'}, {'{customer_phone}'}, etc.
            </p>
          </div>

          {/* Detected Variables */}
          {variables.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Detected Variables
              </label>
              <div className="flex flex-wrap gap-2">
                {variables.map(v => (
                  <span key={v} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Available Variables */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-900 mb-2">
              Available Variables
            </p>
            <div className="text-xs text-blue-800 space-y-1">
              <p>• <code className="bg-blue-100 px-1 rounded">{'{customer_name}'}</code> - Full customer name</p>
              <p>• <code className="bg-blue-100 px-1 rounded">{'{first_name}'}</code> - Customer first name</p>
              <p>• <code className="bg-blue-100 px-1 rounded">{'{last_name}'}</code> - Customer last name</p>
              <p>• <code className="bg-blue-100 px-1 rounded">{'{customer_phone}'}</code> - Customer phone number</p>
              <p>• <code className="bg-blue-100 px-1 rounded">{'{customer_email}'}</code> - Customer email</p>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              These will be automatically replaced when sending to a customer
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name || !content || (!category || (category === "Custom" && !customCategory)) || isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageTemplateDialog;
