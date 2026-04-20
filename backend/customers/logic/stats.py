from django.db.models import Count, Q
from django.utils.timezone import now
from datetime import timedelta
from ..models import Customer, CustomerCategory

def get_customer_summary_stats(branch_id):
    """
    Calculates comprehensive customer statistics at the database level.
    Avoids client-side loops for large datasets.
    """
    if not branch_id:
        return {}

    today = now()
    start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Base Queryset
    qs = Customer.objects.filter(branch_id=branch_id)
    
    # 1. High Level Totals
    total_customers = qs.count()
    
    # New This Month (Created >= first day of current month)
    this_month_new = qs.filter(created_at__gte=start_of_month).count()
    
    # Birthdays THIS MONTH (Filter by month only, ignore year)
    with_birthdays = qs.filter(birthday__month=today.month).count()
    
    # 2. Category Breakdown (DATABASE AGGREGATION)
    # This replaces the heavy loop in frontend/src/hooks/useCustomerData.ts
    category_data = qs.values('category_id').annotate(
        count=Count('id')
    )
    
    # Map into { categoryId: count } for the frontend
    category_breakdown = {
        item['category_id'] if item['category_id'] else 'uncategorized': item['count']
        for item in category_data
    }
    
    return {
        "totalCustomers": total_customers,
        "customersThisMonth": this_month_new,
        "customersWithBirthdays": with_birthdays,
        "categoryBreakdown": category_breakdown,
        "timestamp": today.isoformat()
    }
