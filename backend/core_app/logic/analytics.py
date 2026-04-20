from django.db.models import Sum, Count, F, Q
from django.utils import timezone
from sales.models import Sale, SalesGoal
from finance.models import Expense
from inventory.utils import get_inventory_stats
from django.core.cache import cache

def get_analytics_summary(branch_id, start_date=None, end_date=None):
    """
    Consolidated analytics summary including sales, expenses, inventory stats, and active goals.
    This reduces multiple round-trips from the frontend.
    """
    # Bump cache version to v5 to ensure fresh data schema
    cache_key = f"analytics_summary_v5_{branch_id}_{start_date}_{end_date}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data

    # 1. Sales Stats
    sales_qs = Sale.objects.filter(branch_id=branch_id, is_deleted=False).exclude(status='QUOTE')
    if start_date:
        sales_qs = sales_qs.filter(date__gte=start_date)
    if end_date:
        sales_qs = sales_qs.filter(date__lte=end_date)
            
    sales_totals = sales_qs.aggregate(
        total=Sum('total_amount'),
        tax=Sum('tax_amount'),
        discount=Sum('discount_amount'),
        total_cost=Sum('total_cost'),
        profit=Sum('profit'),
        subtotal=Sum('subtotal')
    )

    total_sales = float(sales_totals['total'] or 0)
    total_cost = float(sales_totals['total_cost'] or 0)
    total_profit = float(sales_totals['profit'] or 0)

    # 2. Status Counts
    counts = sales_qs.values('status').annotate(count=Count('id'))
    count_dict = {item['status']: item['count'] for item in counts}
    paid_count = count_dict.get('COMPLETED', 0)
    pending_count = count_dict.get('PENDING', 0) + count_dict.get('PARTIAL', 0)

    # 3. Expenses
    expenses_qs = Expense.objects.filter(branch_id=branch_id)
    if start_date:
        expenses_qs = expenses_qs.filter(date__gte=start_date)
    if end_date:
        expenses_qs = expenses_qs.filter(date__lte=end_date)
    expenses_stats = expenses_qs.aggregate(total=Sum('amount'))
    total_expenses = float(expenses_stats['total'] or 0)

    # 4. Recent Sales (Optimized)
    # Keeping 20 records as requested, with camelCase keys
    recent_sales = sales_qs.select_related('customer').order_by('-date')[:20]
    recent_sales_data = []
    for s in recent_sales:
        recent_sales_data.append({
            "id": s.id,
            "receiptNumber": s.receipt_number,
            "totalAmount": float(s.total_amount or 0),
            "status": s.status,
            "date": s.date.isoformat() if s.date else None,
            "customerName": s.customer.name if (s.customer and s.customer.name) else (s.customer_name or "Guest")
        })

    # 5. Inventory Stats (Value, Low Stock, etc.)
    inventory_stats = get_inventory_stats(branch_id)

    # 6. Active Goals Progress
    now = timezone.now()
    current_month_name = f"MONTHLY-{now.strftime('%Y-%m')}"
    
    # NEW: Fetch ALL active goals for the location to support instant switching in UI
    all_active_goals = SalesGoal.objects.filter(branch_id=branch_id, status='ACTIVE')
    goals_map = {}

    for g in all_active_goals:
        # Calculate progress for each goal individually
        goal_sales_qs = Sale.objects.filter(branch_id=branch_id, is_deleted=False).exclude(status='QUOTE')
        goal_sales_qs = goal_sales_qs.filter(date__gte=g.start_date, date__lte=g.end_date)
        actual = float(goal_sales_qs.aggregate(t=Sum('total_amount'))['t'] or 0)

        # 🛡️ FIX: Ensure Decimal to float conversion for all operands in math operations
        target = float(g.amount_target)
        progress_percentage = (actual / target * 100) if target > 0 else 0

        goals_map[g.period.lower()] = {
            "id": g.id,
            "amountTarget": target,
            "currentAmount": actual,
            "salesCountTarget": g.sales_count_target,
            "period": g.period,
            "periodName": g.period_name,
            "endDate": g.end_date.isoformat() if g.end_date else None,
            "progressPercentage": float(progress_percentage)
        }

    # LEGACY: Preserve the single goal selection logic for shared parts
    goal = SalesGoal.objects.filter(
        branch_id=branch_id, 
        period_name=current_month_name
    ).first()
    
    if not goal:
        goal = all_active_goals.order_by('-start_date').first()

    goal_data = None
    if goal:
        # 🛡️ FIX: Ensure Decimal to float conversion
        target = float(goal.amount_target)
        actual = float(goal.current_amount)
        progress_percentage = (actual / target * 100) if target > 0 else 0

        goal_data = {
            "id": goal.id,
            "amountTarget": target,
            "currentAmount": actual,
            "salesCountTarget": goal.sales_count_target,
            "currentSalesCount": goal.current_sales_count,
            "period": goal.period,
            "periodName": goal.period_name,
            "endDate": goal.end_date.isoformat() if goal.end_date else None,
            "progressPercentage": float(progress_percentage)
        }

    data = {
        "totalSales": total_sales,
        "totalCost": total_cost,
        "totalProfit": total_profit,
        "paidSalesCount": paid_count,
        "pendingSalesCount": pending_count,
        "totalExpenses": total_expenses,
        "recentSales": recent_sales_data,
        "inventoryStats": inventory_stats,
        "activeGoals": goals_map,
        "activeGoal": goal_data
    }

    # Cache for 5 minutes
    cache.set(cache_key, data, 300)
    return data
