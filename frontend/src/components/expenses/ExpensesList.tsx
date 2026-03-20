"use client";

import React, { useState } from 'react';
import { Eye, Edit, Trash2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCashAccounts } from '@/hooks/useCashAccounts';
import { Expense } from '@/hooks/useExpenses';
import ViewExpenseDialog from './ViewExpenseDialog';
import EditExpenseDialog from './EditExpenseDialog';
import DeleteExpenseDialog from './DeleteExpenseDialog';
import { formatCashCurrency } from '@/lib/utils';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';
import { useProfiles } from '@/contexts/ProfileContext';

interface ExpensesListProps {
  expenses: Expense[];
  onUpdateExpense: (id: string, updates: any) => Promise<any>;
  onDeleteExpense: (id: string) => Promise<boolean>;
  formatCurrency: (amount: number) => string;
}

const ExpensesList: React.FC<ExpensesListProps> = ({
  expenses,
  onUpdateExpense,
  onDeleteExpense,
  formatCurrency
}) => {
  const isMobile = useIsMobile();
  const { accounts } = useCashAccounts();
  const { settings } = useBusinessSettings();
  const { canViewTotalExpenses } = useFinancialVisibility();
  const { hasPermission } = useProfiles();
  const currency = settings.currency || 'USD';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (expense.category && expense.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (expense.paymentMethod && expense.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (expense.personInCharge && expense.personInCharge.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getCashAccountName = (accountId: string | null) => {
    if (!accountId) return null;
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const handleView = (expense: Expense) => {
    setSelectedExpense(expense);
    setViewDialogOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setEditDialogOpen(true);
  };

  const handleDelete = (expense: Expense) => {
    setSelectedExpense(expense);
    setDeleteDialogOpen(true);
  };

  const handleUpdateExpense = async (updates: any) => {
    if (selectedExpense) {
      await onUpdateExpense(selectedExpense.id, updates);
      setEditDialogOpen(false);
      setSelectedExpense(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedExpense) {
      const success = await onDeleteExpense(selectedExpense.id);
      if (success) {
        setDeleteDialogOpen(false);
        setSelectedExpense(null);
      }
    }
  };

  // Mobile Card View
  if (isMobile) {
    return (
      <>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <CardTitle className="text-lg">Expenses List</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm ? 'No expenses found matching your search.' : 'No expenses found.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map((expense) => (
                  <Card
                    key={expense.id}
                    className="p-4 space-y-3 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-red-500"
                    onClick={() => handleView(expense)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="text-sm font-medium text-muted-foreground">
                          {expense.date.toLocaleDateString()}
                        </div>
                        <div className="text-base font-semibold line-clamp-2">
                          {expense.description}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-lg font-bold text-red-600">
                          {canViewTotalExpenses ? formatCashCurrency(expense.amount, currency) : '•••'}
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(expense)}
                            className="h-6 w-6 p-0 text-gray-600 hover:text-gray-700"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {hasPermission('expenses', 'edit') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(expense)}
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {hasPermission('expenses', 'delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(expense)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-muted-foreground">Category:</span>
                        {expense.category ? (
                          <Badge variant="secondary" className="text-xs">{expense.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>

                      {expense.paymentMethod && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-muted-foreground">Payment:</span>
                          <span className="text-xs">{expense.paymentMethod}</span>
                        </div>
                      )}

                      {expense.personInCharge && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-muted-foreground">Person in Charge:</span>
                          <span className="text-xs">{expense.personInCharge}</span>
                        </div>
                      )}

                      {expense.receiptImage && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-muted-foreground">Receipt:</span>
                          <Badge variant="outline" className="text-xs">Available</Badge>
                        </div>
                      )}

                      {expense.cashAccountId && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-muted-foreground">Cash Account:</span>
                          <Badge variant="outline" className="text-xs">{getCashAccountName(expense.cashAccountId)}</Badge>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <ViewExpenseDialog
          expense={selectedExpense}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          formatCurrency={formatCurrency}
          accounts={accounts}
        />

        {/* Edit Dialog */}
        <EditExpenseDialog
          expense={selectedExpense}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSubmit={handleUpdateExpense}
        />

        {/* Delete Dialog */}
        <DeleteExpenseDialog
          expense={selectedExpense}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          formatCurrency={formatCurrency}
        />
      </>
    );
  }

  // Desktop Table View
  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg md:text-xl">Expenses List</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search expenses by description, category, payment method..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No expenses found matching your search.' : 'No expenses found.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Person In Charge</TableHead>
                    <TableHead>Cash Account</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow
                      key={expense.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleView(expense)}
                    >
                      <TableCell className="whitespace-nowrap">
                        {expense.date.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {expense.description}
                      </TableCell>
                      <TableCell>
                        {expense.category ? (
                          <Badge variant="secondary">{expense.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-red-600">
                        {canViewTotalExpenses ? formatCashCurrency(expense.amount, currency) : '•••'}
                      </TableCell>
                      <TableCell>
                        {expense.paymentMethod || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {expense.personInCharge || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {expense.cashAccountId ? (
                          <Badge variant="outline">{getCashAccountName(expense.cashAccountId)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.receiptImage ? (
                          <Badge variant="outline">Receipt</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(expense)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {hasPermission('expenses', 'edit') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(expense)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('expenses', 'delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(expense)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <ViewExpenseDialog
        expense={selectedExpense}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        formatCurrency={formatCurrency}
        accounts={accounts}
      />

      {/* Edit Dialog */}
      <EditExpenseDialog
        expense={selectedExpense}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleUpdateExpense}
      />

      {/* Delete Dialog */}
      <DeleteExpenseDialog
        expense={selectedExpense}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        formatCurrency={formatCurrency}
      />
    </>
  );
};

export default ExpensesList;
