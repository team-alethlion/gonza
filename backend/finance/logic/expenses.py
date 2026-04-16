from django.db.models import Sum, Count, Q, Value
from django.db.models.functions import Coalesce
from datetime import datetime
from decimal import Decimal
from ..serializers import ExpenseSerializer

def get_expense_stats(queryset, user):
    """
    Calculate pre-aggregated statistics for expenses.
    Handles permission-based masking and includes recent transactions.
    """
    # 🛡️ SECURITY: Masking check
    can_view_totals = user.has_permission('dashboard.view_total_expenses')
    
    # Get top 5 recent expenses for overview
    recent_expenses_qs = queryset[:5]
    recent_expenses = ExpenseSerializer(recent_expenses_qs, many=True, context={'request': None}).data
    
    if not can_view_totals:
        return {
            "total_expenses": None,
            "this_month_expenses": None,
            "transaction_count": queryset.count(),
            "category_distribution": [],
            "person_distribution": [],
            "recent_expenses": recent_expenses
        }

    # 🚀 PERFORMANCE: Single aggregation call for totals
    totals = queryset.aggregate(
        total=Sum('amount'),
    )
    total_expenses = totals['total'] or 0
    
    # Calculate this month's expenses
    today = datetime.now()
    this_month_expenses = queryset.filter(
        date__month=today.month, 
        date__year=today.year
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    # Calculate category distribution
    category_dist = queryset.annotate(
        group_name=Coalesce('category', Value('Uncategorized'))
    ).values('group_name').annotate(
        value=Sum('amount'),
        count=Count('id')
    ).order_by('-value')

    # Calculate person distribution
    person_dist = queryset.annotate(
        group_name=Coalesce('person_in_charge', Value('Unassigned'))
    ).values('group_name').annotate(
        value=Sum('amount'),
        count=Count('id')
    ).order_by('-value')

    return {
        "total_expenses": float(total_expenses),
        "this_month_expenses": float(this_month_expenses),
        "transaction_count": queryset.count(),
        "category_distribution": [
            {
                "name": (item['group_name'] or "").strip() or "Uncategorized",
                "value": float(item['value']),
                "count": item['count']
            } for item in category_dist
        ],
        "person_distribution": [
            {
                "name": (item['group_name'] or "").strip() or "Unassigned",
                "value": float(item['value']),
                "count": item['count']
            } for item in person_dist
        ],
        "recent_expenses": recent_expenses
    }
