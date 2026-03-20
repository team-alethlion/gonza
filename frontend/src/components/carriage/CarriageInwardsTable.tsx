"use client";

import React from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye } from 'lucide-react';
import { CarriageInward } from '@/hooks/useCarriageInwards';
import { formatCashCurrency } from '@/lib/utils';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';

import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

interface CarriageInwardsTableProps {
  carriageInwards: CarriageInward[];
  onEdit: (record: CarriageInward) => void;
  onDelete: (id: string) => void;
  onView: (record: CarriageInward) => void;
  isLoading: boolean;
}

const CarriageInwardsTable: React.FC<CarriageInwardsTableProps> = ({
  carriageInwards,
  onEdit,
  onDelete,
  onView,
  isLoading
}) => {
  const { settings } = useBusinessSettings();
  const { canViewCostPrice } = useFinancialVisibility();
  const currency = settings.currency || 'USD';

  const totalAmount = carriageInwards.reduce((sum, record) => sum + record.amount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-32">
            <div className="animate-pulse">Loading carriage inwards records...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (carriageInwards.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">No carriage inwards records found</p>
            <p className="text-sm">Add your first transport cost record to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Carriage Inwards Records</CardTitle>
          {canViewCostPrice && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-lg font-bold">{formatCashCurrency(totalAmount, currency)}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Details</TableHead>
                {canViewCostPrice && <TableHead className="text-right">Amount</TableHead>}
                <TableHead>Payment</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carriageInwards.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {format(record.date, 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {record.supplierName}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={record.details}>
                      {record.details}
                    </div>
                  </TableCell>
                  {canViewCostPrice && (
                    <TableCell className="text-right font-medium">
                      {formatCashCurrency(record.amount, currency)}
                    </TableCell>
                  )}
                  <TableCell>
                    {record.cashAccountId ? (
                      <Badge variant="secondary">Paid</Badge>
                    ) : (
                      <Badge variant="outline">Not Linked</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(record)}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(record)}
                        title="Edit record"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(record.id)}
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CarriageInwardsTable;
