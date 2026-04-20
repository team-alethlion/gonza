from django.db.models import Count, Q
from django.utils.timezone import now
from datetime import date
from ..models import Customer, CustomerCategory

class CustomerSummaryGenerator:
    """
    Definitive module for generating customer business intelligence.
    Calculates statistics and breakdowns at the database level for maximum accuracy.
    """
    
    def __init__(self, branch_id):
        self.branch_id = branch_id
        self.today = now()
        self.start_of_month = self.today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def get_full_summary(self):
        """
        Returns a comprehensive summary object for the Customers dashboard.
        """
        if not self.branch_id:
            return {}

        qs = Customer.objects.filter(branch_id=self.branch_id)
        
        # 1. Core Metrics (Calculated in one pass if possible, or distinct optimized queries)
        metrics = {
            "totalCustomers": qs.count(),
            "newThisMonth": qs.filter(created_at__gte=self.start_of_month).count(),
            "birthdaysThisMonth": qs.filter(birthday__month=self.today.month).count()
        }

        # 2. Category Breakdown
        category_data = qs.values('category_id', 'category__name').annotate(
            count=Count('id')
        )
        
        category_breakdown = {
            (item['category__name'] if item['category__name'] else 'Uncategorized'): item['count']
            for item in category_data
        }

        return {
            "stats": metrics,
            "categoryBreakdown": category_breakdown,
            "branchId": self.branch_id,
            "serverTime": self.today.isoformat()
        }
