
"use client";

import React, { useState } from 'react';
import { Sale, SaleItem } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, RotateCcw, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { processSalesReturnAction } from '@/app/actions/sales';
import { useBusiness } from '@/contexts/BusinessContext';
import { useCashAccounts } from '@/hooks/useCashAccounts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProcessReturnDialogProps {
  sale: Sale | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ProcessReturnDialog: React.FC<ProcessReturnDialogProps> = ({
  sale,
  isOpen,
  onOpenChange,
  onSuccess
}) => {
  const { currentBusiness } = useBusiness();
  const { accounts: cashAccounts } = useCashAccounts();
  const [items, setItems] = useState<any[]>([]);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [cashAccountId, setCashAccountId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize items when sale opens
  React.useEffect(() => {
    if (sale) {
      setItems(sale.items.map(item => ({
        ...item,
        returnQty: 0,
        restock: true,
        remainingQty: item.quantity - ((item as any).quantityReturned || 0) // Backend field
      })));
      setRefundAmount(0);
      setReason('');

      // Auto-select default cash account
      if (cashAccounts.length > 0) {
        const defaultAccount = cashAccounts.find(a => a.isDefault) || cashAccounts[0];
        setCashAccountId(defaultAccount.id);
      }
    }
  }, [sale, cashAccounts]);

  const handleQtyChange = (index: number, val: string) => {
    const qty = parseInt(val) || 0;
    const newItems = [...items];
    const max = newItems[index].remainingQty;
    
    newItems[index].returnQty = Math.min(qty, max);
    setItems(newItems);

    // Auto-calculate suggested refund if needed
    const totalRefund = newItems.reduce((sum, item) => sum + (item.returnQty * item.price), 0);
    setRefundAmount(totalRefund);
  };

  const handleToggleRestock = (index: number) => {
    const newItems = [...items];
    newItems[index].restock = !newItems[index].restock;
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!sale || !currentBusiness) return;

    const returnItems = items
      .filter(item => item.returnQty > 0)
      .map(item => ({
        sale_item_id: (item as any).id || '', // Need the ID
        quantity: item.returnQty,
        refund_amount: 0, // Individual refund not implemented in UI yet
        restock_inventory: item.restock
      }));

    if (returnItems.length === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    if (refundAmount > 0 && !cashAccountId) {
      toast.error("Please select a cash account for the refund");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await processSalesReturnAction({
        sale_id: sale.id,
        items: returnItems,
        refund_amount: refundAmount,
        cash_account_id: cashAccountId || undefined,
        reason: reason,
        locationId: currentBusiness.id
      });

      if (result.success) {
        toast.success("Return processed successfully");
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || "Failed to process return");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sale) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-orange-500" />
            Process Return for Sale #{sale.receiptNumber}
          </DialogTitle>
        </DialogHeader>

        <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            Returns will adjust inventory and can record cash refunds. This action is irreversible.
          </AlertDescription>
        </Alert>

        <ScrollArea className="flex-1 pr-4 py-4">
          <div className="space-y-6">
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Item</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-center w-24">Return</th>
                    <th className="px-4 py-2 text-center">Restock</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, idx) => (
                    <tr key={idx} className={item.returnQty > 0 ? "bg-orange-50/30" : ""}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">Remaining: {item.remainingQty}</p>
                      </td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={item.returnQty}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          className="h-8 text-center"
                          min={0}
                          max={item.remainingQty}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Checkbox 
                          checked={item.restock} 
                          onCheckedChange={() => handleToggleRestock(idx)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reason for Return</Label>
                <Input 
                  placeholder="e.g., Damaged, Customer choice..." 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Refund Amount ({sale.total})</Label>
                <Input 
                  type="number" 
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  className="font-bold text-orange-600"
                />
              </div>
            </div>

            {refundAmount > 0 && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <Label className="text-orange-700 font-bold">Refund Payment Source</Label>
                <Select
                  value={cashAccountId}
                  onValueChange={setCashAccountId}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select a cash account" />
                  </SelectTrigger>
                  <SelectContent>
                    {cashAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} {account.isDefault && "(Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground uppercase">
                  This will record a CASH OUT transaction in the selected account.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processing..." : (
              <>
                <Save className="w-4 h-4" />
                Finalize Return
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProcessReturnDialog;
