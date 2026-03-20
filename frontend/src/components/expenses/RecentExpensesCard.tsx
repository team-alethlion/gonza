import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Expense } from '@/hooks/useExpenses';

interface RecentExpensesCardProps {
  filteredExpenses: Expense[];
  formatCurrency: (amount: number) => string;
}

const RecentExpensesCard: React.FC<RecentExpensesCardProps> = ({
  filteredExpenses,
  formatCurrency
}) => {
  return (
    <Card>
      <CardHeader className="pb-3 md:pb-6">
        <CardTitle className="text-lg md:text-xl">Recent Expenses</CardTitle>
      </CardHeader>
      <CardContent className="px-3 md:px-6">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No expenses found for the selected period.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExpenses.slice(0, 10).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">{expense.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {expense.date.toLocaleDateString()} • {expense.category || 'Uncategorized'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-red-600">
                    {formatCurrency(expense.amount)}
                  </div>
                  {expense.cashAccountId && (
                    <div className="text-xs text-muted-foreground">
                      Linked to Cash
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentExpensesCard;