"use client";
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Check, X, Edit } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface InlineEditableCellProps {
  value: string | number;
  type: 'text' | 'number' | 'select';
  options?: string[];
  currency?: string;
  onSave: (newValue: string | number) => Promise<boolean>;
  className?: string;
  displayFormatter?: (value: string | number) => string;
}

const InlineEditableCell: React.FC<InlineEditableCellProps> = ({
  value,
  type,
  options = [],
  currency,
  onSave,
  className = '',
  displayFormatter
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(value.toString());
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditValue(value.toString());
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    
    try {
      const newValue = type === 'number' ? parseFloat(editValue) || 0 : editValue;
      const success = await onSave(newValue);
      
      if (success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleSave(e as any);
    } else if (e.key === 'Escape') {
      handleCancel(e as any);
    }
  };

  const getDisplayValue = () => {
    if (displayFormatter) {
      return displayFormatter(value);
    }
    
    if (type === 'number' && currency) {
      return `${currency} ${formatNumber(value as number)}`;
    }
    
    return value.toString();
  };

  if (!isEditing) {
    return (
      <div 
        className={`group cursor-pointer flex items-center gap-2 ${className}`}
        onClick={handleEdit}
      >
        <span className="flex-1">{getDisplayValue()}</span>
        <Edit className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {type === 'select' ? (
        <Select value={editValue} onValueChange={setEditValue}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 text-xs"
          autoFocus
          step={type === 'number' ? '0.01' : undefined}
        />
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onClick={handleSave}
        disabled={isSaving}
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onClick={handleCancel}
        disabled={isSaving}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default InlineEditableCell;