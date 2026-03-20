"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CarriageInwardFormData } from '@/hooks/useCarriageInwards';
import { useCashAccounts } from '@/hooks/useCashAccounts';

interface CarriageInwardsFormProps {
  onSubmit: (data: CarriageInwardFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CarriageInwardFormData>;
  isEditing?: boolean;
}

import { useCarriageDraft } from '@/hooks/useCarriageDraft';
import { toast } from 'sonner';

const CarriageInwardsForm: React.FC<CarriageInwardsFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false
}) => {
  const { hasDraft, saveDraft, loadDraft, clearDraft } = useCarriageDraft();
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout>();

  const [formData, setFormData] = useState<CarriageInwardFormData>({
    supplierName: initialData?.supplierName || '',
    details: initialData?.details || '',
    amount: initialData?.amount || 0,
    date: initialData?.date || new Date(),
    cashAccountId: initialData?.cashAccountId || undefined
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { accounts } = useCashAccounts();

  // Load draft on mount for NEW entry
  useEffect(() => {
    if (!isEditing && hasDraft) {
      const draft = loadDraft();
      if (draft) {
        setFormData({
          ...draft.formData,
          date: new Date(draft.formData.date)
        });
        toast.info("Restored your unsaved carriage details");
      }
    }
  }, [isEditing]);

  // Auto-save logic
  useEffect(() => {
    if (isEditing || isSubmitting) return;

    const hasData = formData.supplierName.trim() || formData.details.trim() || formData.amount > 0;

    if (hasData) {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      saveDraft(formData, false); // Instant session save
      autoSaveTimeoutRef.current = setTimeout(() => saveDraft(formData, true), 2000); // Local save
    }

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [formData, isEditing, isSubmitting, saveDraft]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplierName.trim() || !formData.details.trim() || formData.amount <= 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      if (!isEditing) clearDraft();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get the current select value, ensuring it's never undefined for the Select component
  const selectValue = formData.cashAccountId || 'none';

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit Carriage Inwards' : 'Add New Carriage Inwards'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplierName">Supplier Name *</Label>
            <Input
              id="supplierName"
              value={formData.supplierName}
              onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  document.getElementById('details')?.focus();
                }
              }}
              placeholder="Enter supplier name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Details *</Label>
            <Textarea
              id="details"
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  document.getElementById('amount')?.focus();
                }
              }}
              placeholder="Enter transport details"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const dateButton = document.querySelector('[role="combobox"]') as HTMLElement;
                  if (dateButton) {
                    dateButton.focus();
                  }
                }
              }}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const cashAccountSelect = document.querySelector('button[role="combobox"]:last-of-type') as HTMLElement;
                      if (cashAccountSelect) {
                        cashAccountSelect.focus();
                      }
                    }
                  }}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData({ ...formData, date })}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cashAccount">Cash Account (Optional)</Label>
            <Select
              value={selectValue}
              onValueChange={(value) => {
                setFormData({ 
                  ...formData, 
                  cashAccountId: value === 'none' ? undefined : value 
                });
                // Focus submit button after selection
                setTimeout(() => {
                  const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
                  submitButton?.focus();
                }, 100);
              }}
            >
              <SelectTrigger
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => {
                      const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
                      submitButton?.focus();
                    }, 100);
                  }
                }}
              >
                <SelectValue placeholder="Select a cash account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No cash account</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.supplierName.trim() || !formData.details.trim() || formData.amount <= 0}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Add')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CarriageInwardsForm;
