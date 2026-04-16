from django.db.models import Sum, Q, F
from django.db.models.functions import Coalesce
from decimal import Decimal
from sales.models import Sale, SaleItem
from inventory.models import ProductHistory
from ..models import Expense, CarriageInward, CashTransaction
from core.utils import to_decimal

def get_profit_loss_data(branch_id, start_date, end_date, tax_percentage=0):
    """
    Calculates high-precision Profit & Loss data using database-level aggregation.
    """
    # 1. Sales metrics (Excluding Quotes)
    sales_qs = Sale.objects.filter(branch_id=branch_id, date__range=[start_date, end_date]).exclude(status='QUOTE')
    sales_totals = sales_qs.aggregate(
        total=Coalesce(Sum('total_amount'), Decimal('0.00')),
        tax=Coalesce(Sum('tax_amount'), Decimal('0.00')),
        discount=Coalesce(Sum('discount_amount'), Decimal('0.00'))
    )
    total_sales = sales_totals['total']

    # 2. Returns Inward (Sales Returns)
    # We look at ProductHistory for RETURN_IN events during the period
    returns_qs = ProductHistory.objects.filter(
        branch_id=branch_id, 
        created_at__range=[start_date, end_date], 
        type='RETURN_IN'
    )
    # We use the price recorded at the time of return
    total_returns = to_decimal(returns_qs.aggregate(val=Sum(F('quantity_change') * F('new_price')))['val'])
    
    net_sales = total_sales - total_returns

    # 3. COGS Calculation (Cost of Sales - Cost of Returns)
    sale_items = SaleItem.objects.filter(sale__in=sales_qs)
    total_cost_sales = to_decimal(sale_items.aggregate(cost=Sum(F('cost_price') * F('quantity')))['cost'])
    
    # 🚀 ACCURACY FIX: Subtract the cost of items that were returned
    # ProductHistory.old_price stores the cost price at the time of adjustment
    total_cost_returns = to_decimal(returns_qs.aggregate(cost=Sum(F('quantity_change') * F('old_price')))['cost'])
    net_cost_sales = total_cost_sales - total_cost_returns

    # 4. Carriage Inwards
    carriage_total = to_decimal(CarriageInward.objects.filter(
        branch_id=branch_id, date__range=[start_date, end_date]
    ).aggregate(total=Sum('amount'))['total'])

    total_cogs = net_cost_sales + carriage_total
    gross_profit = net_sales - total_cogs

    # 5. Expenses
    expenses_qs = Expense.objects.filter(branch_id=branch_id, date__range=[start_date, end_date])
    total_expenses = to_decimal(expenses_qs.aggregate(total=Sum('amount'))['total'])
    
    # Category Breakdown
    expenses_by_cat = expenses_qs.values('category').annotate(amount=Sum('amount')).order_by('-amount')
    expenses_dict = {e['category'] if e['category'] else 'Uncategorized': float(e['amount']) for e in expenses_by_cat}

    # 6. Final Totals
    net_profit_loss = gross_profit - total_expenses
    tax_amount = (net_profit_loss * Decimal(str(tax_percentage)) / Decimal('100')) if net_profit_loss > 0 else Decimal('0.00')
    final_profit = net_profit_loss - tax_amount

    return {
        "sales": float(total_sales),
        "salesReturns": float(total_returns),
        "netSales": float(net_sales),
        "totalCostSales": float(total_cost_sales),
        "costOfReturns": float(total_cost_returns),
        "netCostSales": float(net_cost_sales),
        "carriageInwards": float(carriage_total),
        "totalCOGS": float(total_cogs),
        "grossProfit": float(gross_profit),
        "totalExpenses": float(total_expenses),
        "expensesByCategory": expenses_dict,
        "netProfitLoss": float(net_profit_loss),
        "taxAmount": float(tax_amount),
        "finalProfitAfterTax": float(final_profit)
    }

def get_account_summary(account, start_date, end_date):
    """
    Calculates account balance and period flows using SQL Coalesce.
    """
    # Opening Balance Calculation
    pre_period = account.transactions.filter(date__lt=start_date).aggregate(
        inflow=Coalesce(Sum('amount', filter=Q(transaction_type__in=['cash_in', 'transfer_in'])), Decimal('0.00')),
        outflow=Coalesce(Sum('amount', filter=Q(transaction_type__in=['cash_out', 'transfer_out'])), Decimal('0.00'))
    )
    opening_balance = account.initial_balance + pre_period['inflow'] - pre_period['outflow']

    # Period Specific Totals
    period = account.transactions.filter(date__range=[start_date, end_date]).aggregate(
        cash_in=Coalesce(Sum('amount', filter=Q(transaction_type='cash_in')), Decimal('0.00')),
        cash_out=Coalesce(Sum('amount', filter=Q(transaction_type='cash_out')), Decimal('0.00')),
        transfer_in=Coalesce(Sum('amount', filter=Q(transaction_type='transfer_in')), Decimal('0.00')),
        transfer_out=Coalesce(Sum('amount', filter=Q(transaction_type='transfer_out')), Decimal('0.00'))
    )

    closing_balance = opening_balance + period['cash_in'] + period['transfer_in'] - period['cash_out'] - period['transfer_out']

    return {
        "openingBalance": float(opening_balance),
        "cashIn": float(period['cash_in']),
        "cashOut": float(period['cash_out']),
        "transfersIn": float(period['transfer_in']),
        "transfersOut": float(period['transfer_out']),
        "closingBalance": float(closing_balance)
    }

def get_live_balance(account):
    """
    Calculates the absolute current balance of an account using SQL aggregation.
    """
    stats = account.transactions.aggregate(
        inflow=Coalesce(Sum('amount', filter=Q(transaction_type__in=['cash_in', 'transfer_in'])), Decimal('0.00')),
        outflow=Coalesce(Sum('amount', filter=Q(transaction_type__in=['cash_out', 'transfer_out'])), Decimal('0.00'))
    )
    return account.initial_balance + stats['inflow'] - stats['outflow']
