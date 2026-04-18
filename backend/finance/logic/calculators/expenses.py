from django.db.models import Sum
from django.db.models.functions import Coalesce
from decimal import Decimal
from ...models import Expense
from core.utils import to_decimal

class ExpenseCalculator:
    """
    Calculates total expenses and provides a breakdown by category.
    """
    def __init__(self, branch_id, start_date, end_date):
        self.branch_id = branch_id
        self.start_date = start_date
        self.end_date = end_date

    def calculate(self):
        # Base Queryset restricted to period and branch
        expenses_qs = Expense.objects.filter(
            branch_id=self.branch_id, 
            date__range=[self.start_date, self.end_date]
        )

        # 1. Total Expenses
        total_expenses = to_decimal(expenses_qs.aggregate(
            total=Coalesce(Sum('amount'), Decimal('0.00'))
        )['total'])

        # 2. Category Breakdown (Database-level annotation)
        expenses_by_cat = expenses_qs.values('category').annotate(
            total_amount=Sum('amount')
        ).order_by('-total_amount')

        breakdown = {
            (item['category'] if item['category'] else 'Uncategorized'): float(item['total_amount'])
            for item in expenses_by_cat
        }

        return {
            "total": total_expenses,
            "breakdown": breakdown,
            "count": expenses_qs.count()
        }
