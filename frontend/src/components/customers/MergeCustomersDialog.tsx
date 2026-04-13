"use client";
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Users, TrendingUp } from 'lucide-react';
import { Customer } from '@/hooks/useCustomers';
import { mergeCustomersAction } from '@/app/actions/customers';
import { toast } from 'sonner';

interface MergeCustomersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onMergeComplete: () => void;
}

const MergeCustomersDialog: React.FC<MergeCustomersDialogProps> = ({
  open,
  onOpenChange,
  customers,
  onMergeComplete
}) => {
  const [mounted, setMounted] = React.useState(false);
  const [primaryCustomerId, setPrimaryCustomerId] = useState<string>(customers[0]?.id || '');
  const [isMerging, setIsMerging] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleMerge = async () => {
    if (!primaryCustomerId || customers.length < 2) return;

    setIsMerging(true);
    try {
      const primaryCustomer = customers.find(c => c.id === primaryCustomerId);
      const duplicateIds = customers.filter(c => c.id !== primaryCustomerId).map(c => c.id);

      if (!primaryCustomer || duplicateIds.length === 0) {
        throw new Error('Invalid selection');
      }

      // Attempt merge using Server Action
      const result = await mergeCustomersAction(primaryCustomer.branchId, primaryCustomerId, duplicateIds);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success(`Successfully merged ${duplicateIds.length} duplicate customer${duplicateIds.length > 1 ? 's' : ''} into ${primaryCustomer.fullName}`);
      onMergeComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error merging customers:', error);
      const errorMessage = error?.message || error?.details || 'Failed to merge customers';
      toast.error(`Merge failed: ${errorMessage}`);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Merge Duplicate Customers
          </DialogTitle>
          <DialogDescription>
            Select which customer record to keep. All sales from duplicates will be transferred to the primary customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">This action cannot be undone</p>
              <p>Duplicate customers will be permanently deleted, and all their sales will be transferred to the primary customer.</p>
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Select Primary Customer (to keep):</Label>
            <RadioGroup value={primaryCustomerId} onValueChange={setPrimaryCustomerId}>
              <div className="space-y-3">
                {customers.map((customer) => (
                  <Card key={customer.id} className={`cursor-pointer transition-all ${primaryCustomerId === customer.id ? 'border-primary border-2 bg-primary/5' : 'hover:border-gray-300'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value={customer.id} id={customer.id} className="mt-1" />
                        <label htmlFor={customer.id} className="flex-1 cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-base">{customer.fullName}</div>
                              <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                                {customer.phoneNumber && (
                                  <div>Phone: {customer.phoneNumber}</div>
                                )}
                                {customer.email && (
                                  <div>Email: {customer.email}</div>
                                )}
                                {customer.location && (
                                  <div>Location: {customer.location}</div>
                                )}
                                <div>Created: {mounted ? customer.createdAt.toLocaleDateString("en-US") : "---"}</div>
                              </div>
                            </div>
                            {primaryCustomerId === customer.id && (
                              <Badge className="bg-primary">Primary</Badge>
                            )}
                          </div>
                        </label>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">After merging:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All sales will be linked to the primary customer</li>
                <li>Duplicate customer records will be deleted</li>
                <li>Sales history will be preserved</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMerging}>
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={isMerging || !primaryCustomerId}>
            {isMerging ? 'Merging...' : `Merge ${customers.length} Customers`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MergeCustomersDialog;
