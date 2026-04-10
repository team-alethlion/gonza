/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, Eye } from 'lucide-react';
import SaleDatePicker from '@/components/sales/SaleDatePicker';
import CustomerInformation from '@/components/sales/CustomerInformation';
import { Customer, FormErrors } from '@/types';

interface SaleFormHeaderProps {
  isEditing: boolean;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  customerName: string;
  customerAddress: string;
  customerContact: string;
  notes?: string;
  onCustomerInfoChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors: FormErrors;
  customers: Customer[];
  onAddNewCustomer?: () => void;
  onSelectCustomer: (customer: Customer) => void;
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onClearForm?: () => void;
  onPreview?: () => void;
  initialCustomerCategories?: any[];
}

const SaleFormHeader: React.FC<SaleFormHeaderProps> = ({
  isEditing,
  selectedDate,
  onDateChange,
  customerName,
  customerAddress,
  customerContact,
  notes,
  onCustomerInfoChange,
  errors,
  customers,
  onAddNewCustomer,
  onSelectCustomer,
  selectedCategoryId,
  onCategoryChange,
  onClearForm,
  onPreview,
  initialCustomerCategories = [],
}) => {
  const router = useRouter();

  const handleBackClick = () => {
    router.push('/agency/sales');
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackClick}
              type="button"
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div>
              <CardTitle>{isEditing ? 'Edit Sale' : 'New Sale'}</CardTitle>
              <CardDescription>Enter the sale details below</CardDescription>
            </div>
          </div>
          {onPreview && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              type="button"
              className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Eye className="h-4 w-4" />
              Preview Receipt
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <SaleDatePicker
          selectedDate={selectedDate}
          onDateChange={onDateChange}
        />

        <CustomerInformation
          customerName={customerName}
          customerAddress={customerAddress}
          customerContact={customerContact}
          notes={notes}
          onCustomerInfoChange={onCustomerInfoChange}
          errors={errors}
          customers={customers}
          onAddNewCustomer={onAddNewCustomer}
          onSelectCustomer={onSelectCustomer}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={onCategoryChange}
          initialCustomerCategories={initialCustomerCategories}
        />
      </CardContent>
    </Card>
  );
};

export default SaleFormHeader;