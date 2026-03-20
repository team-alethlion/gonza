"use client";

import React from 'react';
import { Barcode, Scan } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SaleScannerSectionProps {
  onBarcodeScan?: (code: string) => void;
}

const SaleScannerSection: React.FC<SaleScannerSectionProps> = () => {
  return (
    <Card className="border-dashed border-2 border-primary/20 bg-primary/5 shadow-none group">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full group-hover:bg-primary/20 transition-colors">
            <Scan className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-primary flex items-center gap-2">
              Barcode Scanner Active
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            </p>
            <p className="text-xs text-muted-foreground">
              Scan any product to add it instantly to this sale
            </p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-muted-foreground bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-full border border-border">
          <Barcode className="h-3 w-3" />
          Ready for input
        </div>
      </CardContent>
    </Card>
  );
};

export default SaleScannerSection;
