"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Edit, Eye, Trash2, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CashTransaction } from '@/types/cash';
import { useCashTransactions } from '@/hooks/useCashTransactions';
import { useCashAccounts } from '@/hooks/useCashAccounts';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { exportCashTransactionsToPDF } from '@/utils/exportCashTransactionsToPDF';
import { exportCashTransactionsToCSV } from '@/utils/exportCashTransactionsToCSV';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCashAmount } from '@/lib/utils';
import CashTransactionsFilters from './CashTransactionsFilters';
import { useProfiles } from '@/contexts/ProfileContext';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';

interface CashTransactionsListProps {
  transactions: CashTransaction[];
  accountId?: string | null;
  showAccountColumn?: boolean;
  onEditTransaction?: (transaction: CashTransaction) => void;
  onViewTransaction?: (transaction: CashTransaction) => void;
  onTransactionDeleted?: () => void;
}

const CashTransactionsList: React.FC<CashTransactionsListProps> = ({
  transactions,
  accountId,
  showAccountColumn = true,
  onEditTransaction,
  onViewTransaction,
  onTransactionDeleted
}) => {
  const { deleteTransaction, transactions: allTransactions } = useCashTransactions(accountId || undefined);
  const { accounts } = useCashAccounts();
  const { settings } = useBusinessSettings();
  const { hasPermission } = useProfiles();
  const { canManageFinanceAccounts } = useFinancialVisibility();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const router = useRouter();

  const canEdit = hasPermission('finance', 'edit');
  const canDelete = hasPermission('finance', 'delete');

  const searchParams = useSearchParams();

  // Initialize filters from URL params
  const [searchTerm, setSearchTerm] = useState(() => searchParams?.get('search') || '');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState(() => searchParams?.get('type') || 'all');

  // Update filters when URL changes (navigation back/forward)
  useEffect(() => {
    const search = searchParams?.get('search') || '';
    const type = searchParams?.get('type') || 'all';

    setSearchTerm(search);
    setTransactionTypeFilter(type);
  }, [searchParams]);

  // Functions to update both state and URL
  const updateSearchTerm = (value: string) => {
    setSearchTerm(value);
    const newParams = new URLSearchParams(searchParams?.toString());
    if (value) {
      newParams.set('search', value);
    } else {
      newParams.delete('search');
    }
    router.push(`?${newParams.toString()}`);
  };

  const updateTransactionTypeFilter = (value: string) => {
    setTransactionTypeFilter(value);
    const newParams = new URLSearchParams(searchParams?.toString());
    if (value && value !== 'all') {
      newParams.set('type', value);
    } else {
      newParams.delete('type');
    }
    router.push(`?${newParams.toString()}`);
  };

  const formatCurrency = (amount: number) => {
    return formatCashAmount(amount, settings.currency || 'USD');
  };

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return 'Unknown Account';
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || 'Unknown Account';
  };

  // Filter transactions based on search term and transaction type
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch =
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.category && transaction.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transaction.personInCharge && transaction.personInCharge.toLowerCase().includes(searchTerm.toLowerCase())) ||
      getAccountName(transaction.accountId).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = transactionTypeFilter === 'all' || transaction.transactionType === transactionTypeFilter;

    return matchesSearch && matchesType;
  });

  // Pagination logic - show 50 transactions per page
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 50;
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = startIndex + transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, transactionTypeFilter]);


  // Calculate opening balance for PDF export using the same logic as DailyCashSummary
  const calculateOpeningBalanceForExport = (exportTransactions: CashTransaction[], targetAccountId?: string) => {
    if (exportTransactions.length === 0) return 0;

    // Get the earliest transaction date in the export set
    const earliestDate = exportTransactions.reduce((earliest, transaction) => {
      return transaction.date < earliest ? transaction.date : earliest;
    }, exportTransactions[0].date);

    // Calculate the day before the earliest transaction
    const dayBeforeEarliest = new Date(earliestDate);
    dayBeforeEarliest.setDate(dayBeforeEarliest.getDate() - 1);
    const dayBeforeEarliestStr = dayBeforeEarliest.toISOString().split('T')[0];

    // Get all transactions up to the day before the earliest transaction
    let transactionsBeforeRange = allTransactions.filter(t =>
      t.date.toISOString().split('T')[0] <= dayBeforeEarliestStr
    );

    // Filter by account if specified
    if (targetAccountId) {
      transactionsBeforeRange = transactionsBeforeRange.filter(t => t.accountId === targetAccountId);
    }

    // Calculate cash flow up to the day before
    const cashInBeforeRange = transactionsBeforeRange
      .filter(t => t.transactionType === 'cash_in' || t.transactionType === 'transfer_in')
      .reduce((sum, t) => sum + t.amount, 0);

    const cashOutBeforeRange = transactionsBeforeRange
      .filter(t => t.transactionType === 'cash_out' || t.transactionType === 'transfer_out')
      .reduce((sum, t) => sum + t.amount, 0);

    // Get account's initial opening balance
    let accountOpeningBalance = 0;
    if (targetAccountId) {
      const account = accounts.find(acc => acc.id === targetAccountId);
      accountOpeningBalance = account?.openingBalance || 0;
    }

    // Calculate opening balance: initial balance + net cash flow up to day before
    return accountOpeningBalance + cashInBeforeRange - cashOutBeforeRange;
  };

  // Calculate the date range from filtered transactions
  const getDateRangeFromTransactions = (transactions: CashTransaction[]) => {
    if (transactions.length === 0) return undefined;

    const dates = transactions.map(t => t.date);
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));

    return { from: earliestDate, to: latestDate };
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'cash_in':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cash_out':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'transfer_in':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'transfer_out':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'cash_in':
        return 'Cash In';
      case 'cash_out':
        return 'Cash Out';
      case 'transfer_in':
        return 'Transfer In';
      case 'transfer_out':
        return 'Transfer Out';
      default:
        return type;
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'cash_in':
      case 'transfer_in':
        return 'text-green-600 font-semibold';
      case 'cash_out':
      case 'transfer_out':
        return 'text-red-600 font-semibold';
      default:
        return 'font-semibold';
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const success = await deleteTransaction(id);
      if (success && onTransactionDeleted) {
        onTransactionDeleted();
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportPDF = async () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    try {
      let accountName = '';

      if (accountId) {
        const account = accounts.find(acc => acc.id === accountId);
        accountName = account?.name || '';
      }

      // Calculate the correct opening balance using the same logic as DailyCashSummary
      const calculatedOpeningBalance = calculateOpeningBalanceForExport(filteredTransactions, accountId || undefined);

      // Get the date range from filtered transactions
      const dateRange = getDateRangeFromTransactions(filteredTransactions);

      exportCashTransactionsToPDF(
        filteredTransactions,
        getAccountName,
        formatCurrency,
        accountName,
        calculatedOpeningBalance, // Use calculated opening balance instead of account's initial balance
        settings.currency || 'USD',
        dateRange, // Pass the actual date range from transactions
        {
          businessName: settings.businessName || 'Your Business Name',
          businessAddress: settings.businessAddress || 'Your Business Address',
          businessPhone: settings.businessPhone || '(123) 456-7890',
          businessEmail: settings.businessEmail || 'support@yourbusiness.com'
        }
      );
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    exportCashTransactionsToCSV(filteredTransactions, getAccountName, formatCurrency);
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No transactions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <CashTransactionsFilters
        searchTerm={searchTerm}
        onSearchChange={updateSearchTerm}
        transactionTypeFilter={transactionTypeFilter}
        onTransactionTypeFilterChange={updateTransactionTypeFilter}
        onExportCSV={handleExportCSV}
        onExportPDF={handleExportPDF}
        totalTransactions={filteredTransactions.length}
      />

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No transactions found matching your filters.</p>
        </div>
      ) : (
        <>
          {/* Results Summary */}
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
            </span>
            {totalPages > 1 && (
              <span>
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>

          {isMobile ? (
            /* Mobile Transaction Cards */
            <div className="space-y-4">
              {paginatedTransactions.map((transaction) => (
                <div key={transaction.id} className="bg-white rounded-lg border p-4 space-y-3">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{transaction.description}</div>
                      <div className="text-xs text-gray-500">
                        {format(transaction.date, 'MMM d, yyyy')}
                        {transaction.personInCharge && ` • ${transaction.personInCharge}`}
                      </div>
                    </div>
                    <Badge className={`text-xs ${getTransactionTypeColor(transaction.transactionType)}`}>
                      {getTransactionTypeLabel(transaction.transactionType)}
                    </Badge>
                  </div>

                  {/* Amount */}
                  <div className="flex justify-between items-center">
                    <span className={`text-lg ${getAmountColor(transaction.transactionType)}`}>
                      {canManageFinanceAccounts ? formatCurrency(transaction.amount) : '•••'}
                    </span>

                    {/* Actions */}
                    <div className="flex gap-1">
                      {onViewTransaction && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewTransaction(transaction)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {onEditTransaction && canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditTransaction(transaction)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              disabled={deletingId === transaction.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this transaction? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(transaction.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-1 text-sm text-gray-600">
                    {showAccountColumn && (
                      <div>Account: {getAccountName(transaction.accountId)}</div>
                    )}
                    {transaction.category && (
                      <div className="bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                        <span className="text-blue-800 font-medium">Category: {transaction.category}</span>
                      </div>
                    )}
                    {transaction.paymentMethod && (
                      <div>Payment: {transaction.paymentMethod}</div>
                    )}
                    {transaction.tags && transaction.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {transaction.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop Table */
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Category</TableHead>
                    {showAccountColumn && <TableHead>Account</TableHead>}
                    <TableHead>Person in Charge</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {format(transaction.date, 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        <Badge className={getTransactionTypeColor(transaction.transactionType)}>
                          {getTransactionTypeLabel(transaction.transactionType)}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right ${getAmountColor(transaction.transactionType)}`}>
                        {canManageFinanceAccounts ? formatCurrency(transaction.amount) : '•••'}
                      </TableCell>
                      <TableCell>
                        {transaction.category ? (
                          <div className="bg-blue-50 px-2 py-1 rounded-md border border-blue-200 inline-block">
                            <span className="text-blue-800 font-medium">{transaction.category}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      {showAccountColumn && (
                        <TableCell>{getAccountName(transaction.accountId)}</TableCell>
                      )}
                      <TableCell>{transaction.personInCharge || '-'}</TableCell>
                      <TableCell>{transaction.paymentMethod || '-'}</TableCell>
                      <TableCell>
                        {transaction.tags && transaction.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {transaction.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {onViewTransaction && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewTransaction(transaction)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {onEditTransaction && hasPermission('finance', 'edit') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditTransaction(transaction)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('finance', 'delete') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  disabled={deletingId === transaction.id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this transaction? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(transaction.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}

        </>
      )}
    </div>
  );
};

export default CashTransactionsList;
