"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatNumber, cn } from '@/lib/utils';
import { InstallmentPayment } from '@/hooks/useInstallmentPayments';
import { PaymentChange } from '@/hooks/useLocalPaymentChanges';
import { format } from 'date-fns';
import { Trash2, Clock, Check, X, Edit3, Link, CalendarIcon } from 'lucide-react';

interface CashAccount {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
}

interface InstallmentPaymentHistoryProps {
  payments: InstallmentPayment[];
  currency: string;
  isLoading?: boolean;
  pendingChanges?: PaymentChange[];
  isLocalMode?: boolean;
  onStageChange?: (change: PaymentChange) => void;
  cashAccounts?: CashAccount[];
  onLinkToCash?: (paymentId: string, accountId: string) => Promise<void>;
  onUpdatePayment?: (paymentId: string, updates: { amount?: number; notes?: string; paymentDate?: Date }) => Promise<void>;
}

const InstallmentPaymentHistory: React.FC<InstallmentPaymentHistoryProps> = ({
  payments,
  currency,
  isLoading,
  pendingChanges = [],
  isLocalMode = false,
  onStageChange,
  cashAccounts = [],
  onLinkToCash,
  onUpdatePayment,
}) => {
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'amount' | 'notes' | 'date' | null>(null);
  const [editAmount, setEditAmount] = useState<string>(''); // Changed to string to allow empty value
  const [editNotes, setEditNotes] = useState<string>('');
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [linkingPayment, setLinkingPayment] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const handleStartEdit = (payment: InstallmentPayment, field?: 'amount' | 'notes' | 'date') => {
    setEditingPayment(payment.id);
    setEditingField(field || null);
    setEditAmount(getDisplayAmount(payment).toString()); // Convert to string
    setEditNotes(getDisplayNotes(payment) || '');
    setEditDate(payment.paymentDate);
  };

  const handleDoubleClickAmount = (payment: InstallmentPayment) => {
    if (!isLocalMode || !onStageChange) return;
    const status = getPaymentStatus(payment.id);
    if (status === 'deleted') return;
    
    handleStartEdit(payment, 'amount');
  };

  const handleDoubleClickNotes = (payment: InstallmentPayment) => {
    if (!isLocalMode || !onStageChange) return;
    const status = getPaymentStatus(payment.id);
    if (status === 'deleted') return;
    
    handleStartEdit(payment, 'notes');
  };

  const handleDoubleClickDate = async (payment: InstallmentPayment) => {
    if (!onUpdatePayment) return;
    const status = getPaymentStatus(payment.id);
    if (status === 'deleted') return;
    
    handleStartEdit(payment, 'date');
  };

  const handleDateSelect = async (payment: InstallmentPayment, date: Date | undefined) => {
    if (!date || !onUpdatePayment) return;
    
    console.log('🔵 Date selected:', {
      paymentId: payment.id,
      oldDate: payment.paymentDate,
      newDate: date,
      formattedNew: format(date, 'yyyy-MM-dd')
    });
    
    try {
      await onUpdatePayment(payment.id, { paymentDate: date });
      console.log('✅ Date update successful');
      
      // Update local state immediately for instant UI feedback
      if (onStageChange) {
        onStageChange({
          id: payment.id,
          type: 'update',
          originalPayment: payment,
          updatedData: { paymentDate: date }
        });
      }
      
      // Clear editing state only after successful update
      setEditingPayment(null);
      setEditingField(null);
      setEditDate(undefined);
    } catch (error) {
      console.error('❌ Error updating payment date:', error);
      // Reset to original date on error
      setEditDate(payment.paymentDate);
    }
  };

  const handleSaveEdit = async (payment: InstallmentPayment) => {
    if (!onStageChange && !onUpdatePayment) return;

    // Convert string back to number, default to 0 if empty or invalid
    const numericAmount = editAmount === '' ? 0 : parseFloat(editAmount) || 0;

    if (onStageChange) {
      // Local mode - stage the update
      onStageChange({
        id: payment.id,
        type: 'update',
        originalPayment: payment,
        updatedData: {
          amount: numericAmount,
          notes: editNotes.trim() || undefined
        }
      });
    } else if (onUpdatePayment) {
      // Direct update mode - skip date updates as they're handled separately
      await onUpdatePayment(payment.id, {
        amount: editingField === 'amount' ? numericAmount : undefined,
        notes: editingField === 'notes' ? (editNotes.trim() || undefined) : undefined,
      });
    }

    setEditingPayment(null);
    setEditingField(null);
  };

  const handleCancelEdit = () => {
    setEditingPayment(null);
    setEditingField(null);
    setEditAmount('');
    setEditNotes('');
    setEditDate(undefined);
  };

  const handleStageDelete = (payment: InstallmentPayment) => {
    if (!onStageChange) return;
    
    // Show different confirmation messages based on payment amount
    const isZeroPayment = payment.amount === 0;
    const confirmMessage = isZeroPayment 
      ? 'Are you sure you want to remove this zero-amount payment entry?'
      : 'Are you sure you want to mark this payment for deletion?';
    
    if (window.confirm(confirmMessage)) {
      console.log('🟡 STAGING deletion locally - NO DATABASE CALL');
      
      // Stage the deletion directly without any async operations
      onStageChange({
        id: payment.id,
        type: 'delete',
        originalPayment: payment
      });
      
      console.log('✅ Deletion staged successfully');
    }
  };

  const getPaymentStatus = (paymentId: string) => {
    const change = pendingChanges.find(c => c.id === paymentId);
    if (change?.type === 'delete') return 'deleted';
    if (change?.type === 'update') return 'modified';
    return 'original';
  };

  const getDisplayAmount = (payment: InstallmentPayment) => {
    const change = pendingChanges.find(c => c.id === payment.id && c.type === 'update');
    return change?.updatedData?.amount || payment.amount;
  };

  const getDisplayNotes = (payment: InstallmentPayment) => {
    const change = pendingChanges.find(c => c.id === payment.id && c.type === 'update');
    return change?.updatedData?.notes || payment.notes;
  };

  // Helper function to check if a payment can be deleted
  const canDeletePayment = (payment: InstallmentPayment) => {
    if (!isLocalMode || !onStageChange) return false;
    const status = getPaymentStatus(payment.id);
    return status !== 'deleted'; // Allow deletion of any payment that's not already marked for deletion
  };

  const handleStartCashLink = (paymentId: string) => {
    setLinkingPayment(paymentId);
    setSelectedAccountId('');
  };

  const handleCancelCashLink = () => {
    setLinkingPayment(null);
    setSelectedAccountId('');
  };

  const handleConfirmCashLink = async (payment: InstallmentPayment) => {
    if (!onLinkToCash || !selectedAccountId) return;
    
    try {
      await onLinkToCash(payment.id, selectedAccountId);
      setLinkingPayment(null);
      setSelectedAccountId('');
    } catch (error) {
      console.error('Error linking payment to cash account:', error);
    }
  };

  const getCashAccountName = (cashTransactionId?: string) => {
    if (!cashTransactionId) return null;
    // This is a simplified version - in a real implementation, you might want to
    // fetch the actual account name or pass it as part of the payment data
    return 'Linked';
  };

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-blue-800">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading payment history...</div>
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-blue-800">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No payments recorded yet</div>
        </CardContent>
      </Card>
    );
  }

  const totalPaid = payments.reduce((sum, payment) => {
    const status = getPaymentStatus(payment.id);
    if (status === 'deleted') return sum;
    return sum + getDisplayAmount(payment);
  }, 0);

  const showInlineEdit = isLocalMode && onStageChange;
  console.log('InstallmentPaymentHistory - isLocalMode:', isLocalMode, 'onStageChange:', !!onStageChange, 'showInlineEdit:', showInlineEdit);

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-blue-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            Payment History
            {isLocalMode && <Clock className="h-3 w-3 text-amber-600" />}
            {pendingChanges.length > 0 && (
              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                {pendingChanges.length} staged
              </Badge>
            )}
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
            Total: {currency} {formatNumber(totalPaid)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {/* Desktop editing instructions */}
        {showInlineEdit && (
          <div className="hidden sm:block mb-4 text-xs text-muted-foreground bg-blue-50 p-2 rounded border border-blue-200">
            💡 Double-click on amount or notes to edit. Click delete button to remove payments (including zero amounts).
          </div>
        )}

        {/* Mobile Card Layout */}
        <div className="block sm:hidden space-y-3">
          {payments.map((payment) => {
            const status = getPaymentStatus(payment.id);
            const displayAmount = getDisplayAmount(payment);
            const displayNotes = getDisplayNotes(payment);
            const isEditing = editingPayment === payment.id;
            const canDelete = canDeletePayment(payment);
            
            return (
              <div 
                key={payment.id} 
                className={`bg-white rounded-lg p-3 border shadow-sm ${
                  status === 'deleted' ? 'border-red-200 bg-red-50 opacity-60' :
                  status === 'modified' ? 'border-amber-200 bg-amber-50' :
                  'border-gray-200'
                }`}
              >
                 <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                     {isEditing && editingField === 'date' ? (
                       <Popover>
                         <PopoverTrigger asChild>
                           <Button
                             variant="outline"
                             size="sm"
                             className={cn(
                               "h-7 text-xs justify-start text-left font-normal",
                               !editDate && "text-muted-foreground"
                             )}
                           >
                             <CalendarIcon className="mr-2 h-3 w-3" />
                             {editDate ? format(editDate, "MMM dd, yyyy") : <span>Pick a date</span>}
                           </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={editDate}
                              onSelect={(date) => handleDateSelect(payment, date)}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                         </PopoverContent>
                       </Popover>
                     ) : (
                       <div 
                         className={`text-xs text-muted-foreground ${onUpdatePayment ? 'cursor-pointer hover:text-blue-600' : ''}`}
                         onClick={() => onUpdatePayment && handleDoubleClickDate(payment)}
                         title={onUpdatePayment ? 'Click to edit date' : ''}
                       >
                         {format(payment.paymentDate, 'MMM dd, yyyy')}
                       </div>
                     )}
                     {status === 'deleted' && (
                       <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">
                         To Delete
                       </Badge>
                     )}
                     {status === 'modified' && (
                       <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                         Modified
                       </Badge>
                     )}
                   </div>
                   {isEditing && editingField === 'amount' ? (
                     <div className="flex flex-col gap-2 min-w-0 flex-1 ml-2">
                       <Input
                         type="number"
                         value={editAmount}
                         onChange={(e) => setEditAmount(e.target.value)} // Allow empty string
                         className="h-7 text-xs"
                         step="0.01"
                         min="0"
                         placeholder="0"
                       />
                     </div>
                   ) : (
                     <div className={`text-sm font-semibold ${status === 'deleted' ? 'line-through' : ''}`}>
                       {currency} {formatNumber(displayAmount)}
                     </div>
                   )}
                </div>
                 
                 {isEditing ? (
                   <div className="space-y-2">
                     {editingField === 'notes' && (
                       <Input
                         value={editNotes}
                         onChange={(e) => setEditNotes(e.target.value)}
                         placeholder="Payment notes"
                         className="h-7 text-xs"
                       />
                     )}
                     <div className="flex justify-end gap-2">
                       <Button
                         size="sm"
                         variant="outline"
                         className="h-6 px-2 text-xs"
                         onClick={handleCancelEdit}
                       >
                         <X className="h-3 w-3" />
                       </Button>
                       <Button
                         size="sm"
                         className="h-6 px-2 text-xs"
                         onClick={() => handleSaveEdit(payment)}
                       >
                         <Check className="h-3 w-3" />
                       </Button>
                     </div>
                   </div>
                 ) : (
                  <>
                     {displayNotes && (
                       <div 
                         className={`text-xs text-muted-foreground mb-3 ${status === 'deleted' ? 'line-through' : ''} ${onUpdatePayment ? 'cursor-pointer hover:text-blue-600' : ''}`}
                         onClick={() => onUpdatePayment && handleStartEdit(payment, 'notes')}
                         title={onUpdatePayment ? 'Click to edit notes' : ''}
                       >
                         {displayNotes}
                       </div>
                     )}
                    
                    {/* Cash Account Section for Mobile */}
                    <div className="mb-3">
                      <div className="text-xs text-muted-foreground mb-1">Cash Account:</div>
                      {linkingPayment === payment.id ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedAccountId}
                            onValueChange={setSelectedAccountId}
                          >
                            <SelectTrigger className="h-7 text-xs flex-1">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {cashAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  <div className="flex items-center">
                                    <span>{account.name}</span>
                                    {account.isDefault && (
                                      <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                            onClick={handleCancelCashLink}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-green-500 hover:text-green-700"
                            onClick={() => handleConfirmCashLink(payment)}
                            disabled={!selectedAccountId}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                         <div className="flex items-center gap-2">
                           {payment.cashTransactionId ? (
                             <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                               Linked
                             </Badge>
                           ) : (
                             <>
                               <span className="text-xs text-muted-foreground">Not linked</span>
                               {onLinkToCash && cashAccounts.length > 0 && (
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700"
                                   onClick={() => handleStartCashLink(payment.id)}
                                   title="Link to cash account"
                                 >
                                   <Link className="h-3 w-3" />
                                 </Button>
                               )}
                             </>
                           )}
                         </div>
                      )}
                    </div>
                    
                    {showInlineEdit && canDelete && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                          onClick={() => handleStartEdit(payment)}
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                          onClick={() => handleStageDelete(payment)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Notes</TableHead>
                <TableHead className="text-xs">Cash Account</TableHead>
                {showInlineEdit && (
                  <TableHead className="text-xs w-16">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => {
                const status = getPaymentStatus(payment.id);
                const displayAmount = getDisplayAmount(payment);
                const displayNotes = getDisplayNotes(payment);
                const isEditingThis = editingPayment === payment.id;
                const isEditingAmount = isEditingThis && editingField === 'amount';
                const isEditingNotes = isEditingThis && editingField === 'notes';
                const canDelete = canDeletePayment(payment);
                
                return (
                  <TableRow 
                    key={payment.id}
                    className={
                      status === 'deleted' ? 'bg-red-50 opacity-60' : 
                      status === 'modified' ? 'bg-amber-50' : ''
                    }
                  >
                     <TableCell className="text-xs">
                       <div className="flex items-center gap-2">
                         {editingPayment === payment.id && editingField === 'date' ? (
                           <div className="flex items-center gap-1">
                             <Popover>
                               <PopoverTrigger asChild>
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   className={cn(
                                     "h-7 text-xs justify-start text-left font-normal w-32",
                                     !editDate && "text-muted-foreground"
                                   )}
                                 >
                                   <CalendarIcon className="mr-2 h-3 w-3" />
                                   {editDate ? format(editDate, "MMM dd, yyyy") : <span>Pick a date</span>}
                                 </Button>
                               </PopoverTrigger>
                               <PopoverContent className="w-auto p-0" align="start">
                         <Calendar
                           mode="single"
                           selected={editDate}
                           onSelect={(date) => handleDateSelect(payment, date)}
                           initialFocus
                           className={cn("p-3 pointer-events-auto")}
                         />
                               </PopoverContent>
                             </Popover>
                             <Button
                               size="sm"
                               variant="ghost"
                               className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                               onClick={handleCancelEdit}
                             >
                               <X className="h-3 w-3" />
                             </Button>
                             <Button
                               size="sm"
                               variant="ghost"
                               className="h-6 w-6 p-0 text-green-500 hover:text-green-700"
                               onClick={() => handleSaveEdit(payment)}
                             >
                               <Check className="h-3 w-3" />
                             </Button>
                           </div>
                         ) : (
                           <span 
                             className={`cursor-pointer hover:bg-gray-100 px-2 py-1 rounded ${
                               status === 'deleted' ? 'line-through' : ''
                             } ${onUpdatePayment ? 'hover:bg-blue-50' : ''}`}
                             onClick={() => onUpdatePayment && handleDoubleClickDate(payment)}
                             title={onUpdatePayment ? 'Click to edit date' : ''}
                           >
                             {format(payment.paymentDate, 'MMM dd, yyyy')}
                           </span>
                         )}
                         {status === 'deleted' && (
                           <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">
                             To Delete
                           </Badge>
                         )}
                         {status === 'modified' && (
                           <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                             Modified
                           </Badge>
                         )}
                       </div>
                     </TableCell>
                    <TableCell className="text-xs text-right">
                      {isEditingAmount ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)} // Allow empty string
                            className="h-7 text-xs w-24"
                            step="0.01"
                            min="0"
                            autoFocus
                            placeholder="0"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-green-500 hover:text-green-700"
                            onClick={() => handleSaveEdit(payment)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span 
                          className={`font-medium cursor-pointer hover:bg-gray-100 px-2 py-1 rounded ${
                            status === 'deleted' ? 'line-through' : ''
                          } ${showInlineEdit && canDelete ? 'hover:bg-blue-50' : ''}`}
                          onDoubleClick={() => handleDoubleClickAmount(payment)}
                          title={showInlineEdit && canDelete ? 'Double-click to edit' : ''}
                        >
                          {currency} {formatNumber(displayAmount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {isEditingNotes ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Payment notes"
                            className="h-7 text-xs"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-green-500 hover:text-green-700"
                            onClick={() => handleSaveEdit(payment)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span 
                          className={`text-muted-foreground cursor-pointer hover:bg-gray-100 px-2 py-1 rounded ${
                            status === 'deleted' ? 'line-through' : ''
                          } ${showInlineEdit && canDelete ? 'hover:bg-blue-50' : ''}`}
                          onDoubleClick={() => handleDoubleClickNotes(payment)}
                          title={showInlineEdit && canDelete ? 'Double-click to edit' : ''}
                        >
                          {displayNotes || '-'}
                        </span>
                       )}
                     </TableCell>
                     <TableCell className="text-xs">
                       {linkingPayment === payment.id ? (
                         <div className="flex items-center gap-1">
                           <Select
                             value={selectedAccountId}
                             onValueChange={setSelectedAccountId}
                           >
                             <SelectTrigger className="h-7 text-xs w-32">
                               <SelectValue placeholder="Select account" />
                             </SelectTrigger>
                             <SelectContent>
                               {cashAccounts.map((account) => (
                                 <SelectItem key={account.id} value={account.id}>
                                   <div className="flex items-center">
                                     <span>{account.name}</span>
                                     {account.isDefault && (
                                       <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                                         Default
                                       </span>
                                     )}
                                   </div>
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                           <Button
                             size="sm"
                             variant="ghost"
                             className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                             onClick={handleCancelCashLink}
                           >
                             <X className="h-3 w-3" />
                           </Button>
                           <Button
                             size="sm"
                             variant="ghost"
                             className="h-6 w-6 p-0 text-green-500 hover:text-green-700"
                             onClick={() => handleConfirmCashLink(payment)}
                             disabled={!selectedAccountId}
                           >
                             <Check className="h-3 w-3" />
                           </Button>
                         </div>
                       ) : (
                          <div className="flex items-center gap-1">
                            {payment.cashTransactionId ? (
                              <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                                Linked
                              </Badge>
                            ) : (
                              onLinkToCash && cashAccounts.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700"
                                  onClick={() => handleStartCashLink(payment.id)}
                                  title="Link to cash account"
                                >
                                  <Link className="h-3 w-3" />
                                </Button>
                              )
                            )}
                          </div>
                       )}
                     </TableCell>
                    {showInlineEdit && (
                      <TableCell className="text-xs">
                        {!isEditingThis && canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={() => handleStageDelete(payment)}
                            title="Delete payment"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstallmentPaymentHistory;
