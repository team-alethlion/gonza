
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { NoticeTemplate, noticeTemplates } from '@/utils/noticeTemplates';

interface NoticeTemplateSelectorProps {
  selectedTemplate: string;
  onTemplateChange: (templateId: string) => void;
  onTemplateSelect: (template: NoticeTemplate) => void;
}

const NoticeTemplateSelector: React.FC<NoticeTemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateChange,
  onTemplateSelect
}) => {
  const handleTemplateChange = (templateId: string) => {
    onTemplateChange(templateId);
    if (templateId === 'none') {
      // Clear template selection
      return;
    }
    const template = noticeTemplates.find(t => t.id === templateId);
    if (template) {
      onTemplateSelect(template);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      payment: 'bg-red-50 text-red-700 border-red-200',
      policy: 'bg-blue-50 text-blue-700 border-blue-200',
      general: 'bg-gray-50 text-gray-700 border-gray-200',
      announcement: 'bg-green-50 text-green-700 border-green-200',
      gratitude: 'bg-purple-50 text-purple-700 border-purple-200'
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  // Type guard to ensure we have a valid array
  const templates = Array.isArray(noticeTemplates) ? noticeTemplates : [];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Choose a Template (Optional)
      </label>
      <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a notice template or start from scratch" />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          <SelectItem value="none">Start from scratch</SelectItem>
          {templates.length > 0 && templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{template.name}</span>
                <Badge 
                  variant="outline" 
                  className={`ml-2 text-xs ${getCategoryColor(template.category)}`}
                >
                  {template.category}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedTemplate && selectedTemplate !== 'none' && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Template selected:</strong> {templates.find(t => t.id === selectedTemplate)?.name}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            The template content has been added to your message. You can edit it as needed.
          </p>
        </div>
      )}
    </div>
  );
};

export default NoticeTemplateSelector;
