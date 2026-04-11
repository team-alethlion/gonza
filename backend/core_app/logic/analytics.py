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
    # Bump cache version to v4 to ensure fresh data schema
    cache_key = f"analytics_summary_v4_{branch_id}_{start_date}_{end_date}"
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
        total_cost=Sum('total_cost')
    )

    total_sales = float(sales_totals['total'] or 0)
    total_cost = float(sales_totals['total_cost'] or 0)
    total_profit = total_sales - total_cost

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
    recent_sales = sales_qs.select_related('customer').order_by('-date')[:20]
    recent_sales_data = []
    for s in recent_sales:
        recent_sales_data.append({
            "id": s.id,
            "receiptNumber": s.receipt_number,
            "totalAmount": float(s.total_amount),
            "status": s.status,
            "date": s.date.isoformat() if s.date else None,
            "customerName": s.customer.name if s.customer else "Guest"
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
        goals_map[g.period.lower()] = {
            "id": g.id,
            "amountTarget": float(g.amount_target),
            "currentAmount": float(g.current_amount),
            "salesCountTarget": g.sales_count_target,
            "period": g.period,
            "periodName": g.period_name,
            "endDate": g.end_date.isoformat() if g.end_date else None,
            "progressPercentage": float((g.current_amount / g.amount_target * 100)) if g.amount_target > 0 else 0
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
        goal_data = {
            "id": goal.id,
            "amountTarget": float(goal.amount_target),
            "currentAmount": float(goal.current_amount),
            "salesCountTarget": goal.sales_count_target,
            "currentSalesCount": goal.current_sales_count,
            "period": goal.period,
            "periodName": goal.period_name,
            "endDate": goal.end_date.isoformat() if goal.end_date else None,
            "progressPercentage": float((goal.current_amount / goal.amount_target * 100)) if goal.amount_target > 0 else 0
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
        "activeGoal": goal_data,
        "activeGoals": goals_map
    }

    # Cache for 5 minutes
    cache.set(cache_key, data, 300)
    return data
