"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, CreditCard } from 'lucide-react';

interface PaymentMethod {
  method: string;
  accountNumber: string;
  accountName: string;
}

interface PaymentMethodsManagerProps {
  paymentMethods: PaymentMethod[];
  onPaymentMethodChange: (index: number, field: 'method' | 'accountNumber' | 'accountName', value: string) => void;
  onAddPaymentMethod: () => void;
  onRemovePaymentMethod: (index: number) => void;
}

const PaymentMethodsManager: React.FC<PaymentMethodsManagerProps> = ({
  paymentMethods,
  onPaymentMethodChange,
  onAddPaymentMethod,
  onRemovePaymentMethod,
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <CardTitle>Payment Information</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onAddPaymentMethod}
            className="text-xs"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Method
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md p-3">
          <Table className="text-sm w-full">
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-medium py-1 px-2 w-[30%] text-left">Payment Method</TableHead>
                <TableHead className="font-medium py-1 px-2 w-[30%] text-left">Account Number</TableHead>
                <TableHead className="font-medium py-1 px-2 text-left">Account Name</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentMethods.length > 0 ? (
                paymentMethods.map((payment, index) => (
                  <TableRow key={`payment-${index}`} className="border-b border-gray-100">
                    <TableCell className="py-1 px-2">
                      <Input
                        value={payment.method}
                        onChange={(e) => onPaymentMethodChange(index, 'method', e.target.value)}
                        placeholder="e.g., Bank Transfer"
                        className="w-full p-1 h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell className="py-1 px-2">
                      <Input
                        value={payment.accountNumber}
                        onChange={(e) => onPaymentMethodChange(index, 'accountNumber', e.target.value)}
                        placeholder="e.g., 12345678"
                        className="w-full p-1 h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell className="py-1 px-2">
                      <Input
                        value={payment.accountName}
                        onChange={(e) => onPaymentMethodChange(index, 'accountName', e.target.value)}
                        placeholder="e.g., John Doe"
                        className="w-full p-1 h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell className="py-1 px-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemovePaymentMethod(index)}
                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-sm text-muted-foreground">
                    No payment methods added yet. Click "Add Method" to add one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <p className="text-xs text-muted-foreground mt-3">
          Enter payment information to display on receipts. Each row will appear in the payment information table on receipts.
          Leave empty if you don't want to show payment information.
        </p>
      </CardContent>
    </Card>
  );
};

export default PaymentMethodsManager;