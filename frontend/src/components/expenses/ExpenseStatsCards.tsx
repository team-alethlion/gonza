import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

interface ExpenseStatsCardsProps {
  totalExpenses: number;
  thisMonthExpenses: number;
  transactionCount: number;
  formatCurrency: (amount: number) => string;
  dateFilter: string;
}

const ExpenseStatsCards: React.FC<ExpenseStatsCardsProps> = ({
  totalExpenses,
  thisMonthExpenses,
  transactionCount,
  formatCurrency,
  dateFilter
}) => {
  const { canViewTotalExpenses } = useFinancialVisibility();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Expenses ({dateFilter === 'all' ? 'All Time' : dateFilter.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {canViewTotalExpenses ? formatCurrency(totalExpenses) : '•••'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {canViewTotalExpenses ? formatCurrency(thisMonthExpenses) : '•••'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {transactionCount}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseStatsCards;