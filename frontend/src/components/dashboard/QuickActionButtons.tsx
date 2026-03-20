"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Receipt, FileText, Quote, CreditCard } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface QuickActionButtonsProps {
  onQuickCreate: (paymentStatus: 'Paid' | 'NOT PAID' | 'Quote' | 'Installment Sale') => void;
}

const QuickActionButtons: React.FC<QuickActionButtonsProps> = ({ onQuickCreate }) => {
  const isMobile = useIsMobile();

  return (
    <div className={`${isMobile ? 'mb-4' : 'mb-6'}`}>
      <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 lg:grid-cols-4 gap-4'} max-w-4xl`}>
        <Button 
          onClick={() => onQuickCreate('Paid')} 
          variant="outline" 
          className={`gap-2 ${isMobile ? 'h-10 text-xs' : 'h-12'} justify-start`}
        >
          <Receipt className="h-4 w-4 text-green-600" />
          <span>{isMobile ? 'Receipt' : 'Create Receipt'}</span>
        </Button>
        <Button 
          onClick={() => onQuickCreate('NOT PAID')} 
          variant="outline" 
          className={`gap-2 ${isMobile ? 'h-10 text-xs' : 'h-12'} justify-start`}
        >
          <FileText className="h-4 w-4 text-orange-600" />
          <span>{isMobile ? 'Invoice' : 'Create Invoice'}</span>
        </Button>
        <Button 
          onClick={() => onQuickCreate('Installment Sale')} 
          variant="outline" 
          className={`gap-2 ${isMobile ? 'h-10 text-xs' : 'h-12'} justify-start`}
        >
          <CreditCard className="h-4 w-4 text-purple-600" />
          <span>{isMobile ? 'Installment' : 'Create Installment Sale'}</span>
        </Button>
        <Button 
          onClick={() => onQuickCreate('Quote')} 
          variant="outline" 
          className={`gap-2 ${isMobile ? 'h-10 text-xs' : 'h-12'} justify-start`}
        >
          <Quote className="h-4 w-4 text-blue-600" />
          <span>{isMobile ? 'Quote' : 'Create Quotation'}</span>
        </Button>
      </div>
    </div>
  );
};

export default QuickActionButtons;