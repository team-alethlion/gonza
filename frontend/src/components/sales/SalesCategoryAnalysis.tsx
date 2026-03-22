"use client";
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sale } from '@/types';
import { useSalesCategories } from '@/hooks/useSalesCategories';
import { useIsMobile } from '@/hooks/use-mobile';
import { TrendingUp, DollarSign, ShoppingCart, Trophy, Target, Edit2, Trash2, Plus, Check, X, Settings, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, isAfter, isBefore, isEqual, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';
import { getSalesCategorySummaryAction } from '@/app/actions/sales';
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/BusinessContext';
interface SalesCategoryAnalysisProps {
  sales: Sale[];
  formatCurrency: (amount: number) => string;
}
const PieTooltip = ({
  active,
  payload,
  categoryPerformance,
  formatCurrency
}: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const totalRevenue = categoryPerformance.reduce((sum: number, cat: any) => sum + cat.revenue, 0);
    const percentage = totalRevenue > 0 ? (data.revenue / totalRevenue * 100).toFixed(1) : '0';
    return <div className="bg-background border rounded-lg p-3 shadow-lg">
      <p className="font-medium">{data.name}</p>
      <p className="text-sm text-muted-foreground">
        Revenue: {formatCurrency(data.revenue)}
      </p>
      <p className="text-sm text-muted-foreground">
        Share: {percentage}%
      </p>
    </div>;
  }
  return null;
};

const SalesCategoryAnalysis: React.FC<SalesCategoryAnalysisProps> = ({
  sales,
  formatCurrency
}) => {
  const { canViewProfit } = useFinancialVisibility();
  const { currentBusiness } = useBusiness();
  const {
    categories,
    createCategory,
    updateCategory,
    deleteCategory
  } = useSalesCategories();
  const isMobile = useIsMobile();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('all-time');
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [specificDate, setSpecificDate] = useState<Date | undefined>();

  const getDateRange = (filter: string) => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday)
        };
      case 'this-week':
        return {
          start: startOfWeek(now),
          end: endOfWeek(now)
        };
      case 'last-week':
        const lastWeekStart = startOfWeek(subWeeks(now, 1));
        const lastWeekEnd = endOfWeek(subWeeks(now, 1));
        return {
          start: lastWeekStart,
          end: lastWeekEnd
        };
      case 'this-month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'last-month':
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));
        return {
          start: lastMonthStart,
          end: lastMonthEnd
        };
      case 'this-year':
        return {
          start: startOfYear(now),
          end: endOfYear(now)
        };
      case 'specific-date':
        if (specificDate) {
          return {
            start: startOfDay(specificDate),
            end: endOfDay(specificDate)
          };
        }
        return null;
      case 'custom-range':
        if (customDateFrom && customDateTo) {
          return {
            start: startOfDay(customDateFrom),
            end: endOfDay(customDateTo)
          };
        } else if (customDateFrom) {
          return {
            start: startOfDay(customDateFrom),
            end: endOfDay(now)
          };
        } else if (customDateTo) {
          return {
            start: startOfDay(new Date(0)),
            end: endOfDay(customDateTo)
          };
        }
        return null;
      case 'all-time':
      default:
        return null;
    }
  };

  const dateRangeParams = useMemo(() => {
    const range = getDateRange(dateFilter);
    if (!range) return { start: undefined, end: undefined };
    return {
      start: range.start.toISOString(),
      end: range.end.toISOString()
    };
  }, [dateFilter, customDateFrom, customDateTo, specificDate]);
  // 🚀 SERVER-SIDE AGGREGATION: Fetch accurate totals from the backend
  const { data: serverCategoryPerformance = [], isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['sales-category-summary', currentBusiness?.id, dateFilter, dateRangeParams],
    queryFn: async () => {
      if (!currentBusiness?.id) return [];
      const result = await getSalesCategorySummaryAction(
        currentBusiness.id, 
        dateRangeParams.start, 
        dateRangeParams.end
      );
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!currentBusiness?.id
  });

  const categoryPerformance = useMemo(() => {
    return serverCategoryPerformance;
  }, [serverCategoryPerformance]);

  const pieChartData = useMemo(() => {
    return categoryPerformance.filter(cat => cat.revenue > 0).map((category, index) => ({
      ...category,
      fill: `hsl(var(--chart-${index % 5 + 1}))`
    }));
  }, [categoryPerformance]);
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
  const getIcon = (index: number) => {
    const icons = [DollarSign, TrendingUp, ShoppingCart, Target];
    const Icon = icons[index % icons.length];
    return <Icon className="w-4 h-4 text-muted-foreground" />;
  };
  const handleEditStart = (category: any) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };
  const handleEditSave = async () => {
    if (!editingId || !editingName.trim()) return;
    try {
      await updateCategory(editingId, editingName.trim());
      setEditingId(null);
      setEditingName('');
      toast.success('Category updated successfully');
    } catch (error) {
      toast.error('Failed to update category');
    }
  };
  const handleEditCancel = () => {
    setEditingId(null);
    setEditingName('');
  };
  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      toast.success('Category deleted successfully');
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      toast.error('Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };
  const handleDeleteClick = (category: {
    id: string;
    name: string;
  }) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsAdding(true);
    try {
      await createCategory(newCategoryName.trim());
      setNewCategoryName('');
      toast.success('Category created successfully');
    } catch (error) {
      toast.error('Failed to create category');
    } finally {
      setIsAdding(false);
    }
  };
  return <div className="space-y-6">
    {/* Category Management Section */}
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Manage Sales Sources
        </CardTitle>
        <CardDescription>Create, edit, or delete sales sources</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Create new source */}
          <div className="flex gap-2 p-3 bg-muted/30 rounded-lg">
            <Input placeholder="Enter New Sales Source" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateCategory()} className="flex-1" />
            <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim() || isAdding} size="sm" className="shrink-0">
              {isAdding ? <>
                <div className="w-4 h-4 mr-1 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Adding...
              </> : <>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </>}
            </Button>
          </div>

          {/* List existing sources */}
          <div className="space-y-2">
            {categories.map(category => <div key={category.id} className="flex items-center gap-2 p-3 border rounded-lg bg-background hover:bg-muted/20 transition-colors">
              {editingId === category.id ? <>
                <Input value={editingName} onChange={e => setEditingName(e.target.value)} onKeyDown={e => {
                  if (e.key === 'Enter') handleEditSave();
                  if (e.key === 'Escape') handleEditCancel();
                }} className="flex-1" autoFocus />
                <Button size="sm" variant="outline" onClick={handleEditSave}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleEditCancel}>
                  <X className="w-4 h-4" />
                </Button>
              </> : <>
                <span className="flex-1 font-medium">{category.name}</span>
                <Button size="sm" variant="outline" onClick={() => handleEditStart(category)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDeleteClick(category)} className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>}
            </div>)}

            {categories.length === 0 && <div className="text-center py-8 text-muted-foreground">
              No sources found. Create your first source above.
            </div>}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Date Filter */}
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          Date Filter
        </CardTitle>
        <CardDescription>
          Filter source performance by time period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Time Period</label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="all-time">All Time</SelectItem>
                <SelectItem value="specific-date">Specific Date</SelectItem>
                <SelectItem value="custom-range">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom Date Range Fields */}
        {dateFilter === 'custom-range' && <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">From Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !customDateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDateFrom ? format(customDateFrom, "PPP") : <span>Pick start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customDateFrom} onSelect={setCustomDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">To Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !customDateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDateTo ? format(customDateTo, "PPP") : <span>Pick end date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customDateTo} onSelect={setCustomDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
        </div>}

        {/* Specific Date Field */}
        {dateFilter === 'specific-date' && <div className="mt-4">
          <label className="text-sm font-medium mb-2 block">Select Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full sm:w-64 justify-start text-left font-normal", !specificDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {specificDate ? format(specificDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={specificDate} onSelect={setSpecificDate} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>}

        {dateFilter !== 'all-time' && <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Showing results for: <span className="font-medium">{dateFilter === 'today' ? 'Today' : dateFilter === 'yesterday' ? 'Yesterday' : dateFilter === 'this-week' ? 'This Week' : dateFilter === 'last-week' ? 'Last Week' : dateFilter === 'this-month' ? 'This Month' : dateFilter === 'last-month' ? 'Last Month' : dateFilter === 'this-year' ? 'This Year' : dateFilter === 'specific-date' && specificDate ? format(specificDate, "PPP") : dateFilter === 'custom-range' && customDateFrom && customDateTo ? `${format(customDateFrom, "PPP")} to ${format(customDateTo, "PPP")}` : dateFilter === 'custom-range' && customDateFrom ? `From ${format(customDateFrom, "PPP")}` : dateFilter === 'custom-range' && customDateTo ? `Until ${format(customDateTo, "PPP")}` : 'Custom Period'}</span>
          </p>
        </div>}
      </CardContent>
    </Card>

    {/* Source Performance Chart */}
    {pieChartData.length > 0 && (
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Source Performance
            </CardTitle>
            <CardDescription>Revenue distribution by sales source</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="revenue"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip categoryPerformance={categoryPerformance} formatCurrency={formatCurrency} />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    )}

    {/* Category Rankings Table */}
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Source Rankings
        </CardTitle>
        <CardDescription>
          Best performing sources ranked by revenue
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAnalyticsLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground">Calculating source performance...</p>
          </div>
        ) : categoryPerformance.length > 0 ? isMobile ? <div className="space-y-3">
          {categoryPerformance.map((category, index) => <Card key={category.name} className="border border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                </div>
                <Trophy className="w-5 h-5 text-primary" />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(category.revenue)}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-muted-foreground">Total Profit</span>
                  </div>
                  <span className="font-semibold">{canViewProfit ? formatCurrency(category.profit) : '•••'}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-muted-foreground">Number of Sales</span>
                  </div>
                  <span className="font-semibold">{category.transactions}</span>
                </div>
              </div>
            </CardContent>
          </Card>)}
        </div> : <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Source Name</TableHead>
              <TableHead className="text-right">Total Revenue</TableHead>
              <TableHead className="text-right">Total Profit</TableHead>
              <TableHead className="text-right">Number of Sales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryPerformance.map((category, index) => <TableRow key={category.name}>
              <TableCell className="font-medium">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                  {index + 1}
                </div>
              </TableCell>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(category.revenue)}</TableCell>
              <TableCell className="text-right font-mono">{canViewProfit ? formatCurrency(category.profit) : '•••'}</TableCell>
              <TableCell className="text-right">{category.transactions}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table> : <div className="flex items-center justify-center h-64 text-muted-foreground">
          No performance data available
        </div>}
      </CardContent>
    </Card>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Source</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the source &quot;{categoryToDelete?.name}&quot;?
            This action cannot be undone. All sales in this source will be moved to &quot;Uncategorized&quot;.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isDeleting ? <>
              <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Deleting...
            </> : 'Delete Source'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
};
export default SalesCategoryAnalysis;