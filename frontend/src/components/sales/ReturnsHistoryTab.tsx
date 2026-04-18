
"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSalesReturnsAction } from '@/app/actions/sales';
import { useBusiness } from '@/contexts/BusinessContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { RotateCcw, User, FileText } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

const ReturnsHistoryTab = () => {
  const { currentBusiness } = useBusiness();
  const { settings } = useBusinessSettings();

  const { data, isLoading } = useQuery({
    queryKey: ['sales_returns', currentBusiness?.id],
    queryFn: async () => {
      if (!currentBusiness?.id) return { returns: [], count: 0 };
      const result = await getSalesReturnsAction(currentBusiness.id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!currentBusiness?.id
  });

  const currency = settings?.currency || 'UGX';

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const returns = data?.returns || [];

  if (returns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-xl border-2 border-dashed">
        <div className="bg-orange-100 p-4 rounded-full mb-4">
          <RotateCcw className="w-8 h-8 text-orange-600" />
        </div>
        <h3 className="text-lg font-semibold">No returns recorded</h3>
        <p className="text-muted-foreground max-w-sm mx-auto mt-2">
          Processed sales returns will appear here once you initiate them from the Sales Overview tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-orange-700">
          <RotateCcw className="h-5 w-5" />
          Returns Ledger
        </h3>
        <p className="text-sm text-muted-foreground">
          View a detailed history of all items returned by customers.
        </p>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Return #</TableHead>
              <TableHead>Sale Ref</TableHead>
              <TableHead>Refund</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.map((ret: any) => (
              <TableRow key={ret.id}>
                <TableCell className="font-medium">
                  {format(new Date(ret.date), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell className="font-mono text-xs">{ret.return_number}</TableCell>
                <TableCell>
                    <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        #{ret.sale_receipt_number}
                    </div>
                </TableCell>
                <TableCell className="font-bold text-orange-600">
                  {currency} {formatNumber(ret.total_refund_amount)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {ret.items?.map((item: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {item.product_name} (x{item.quantity})
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-xs italic">
                  {ret.reason || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ReturnsHistoryTab;
