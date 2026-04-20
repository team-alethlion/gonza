from django.db.models import Q
from django_filters import rest_framework as filters
from .models import Expense, CashTransaction

class ExpenseFilter(filters.FilterSet):
    category_name = filters.CharFilter(field_name='category', lookup_expr='icontains')
    date_from = filters.DateTimeFilter(field_name='date', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='date', lookup_expr='lte')
    search = filters.CharFilter(method='filter_search')

    class Meta:
        model = Expense
        fields = ['branch_id', 'category', 'payment_method', 'cash_account']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(description__icontains=value) |
            Q(category__icontains=value) |
            Q(payment_method__icontains=value) |
            Q(person_in_charge__icontains=value)
        )

class CashTransactionFilter(filters.FilterSet):
    date_from = filters.DateTimeFilter(field_name='date', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='date', lookup_expr='lte')
    transaction_type = filters.CharFilter(field_name='transaction_type')
    search = filters.CharFilter(method='filter_search')
    
    # 🚀 FIX: Support multiple naming conventions from different frontend parts
    branchId = filters.CharFilter(field_name='branch_id')
    branch_id = filters.CharFilter(field_name='branch_id')
    locationId = filters.CharFilter(field_name='branch_id')

    class Meta:
        model = CashTransaction
        fields = ['branch_id', 'branchId', 'locationId', 'account', 'transaction_type', 'category']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            description__icontains=value
        ) | queryset.filter(
            person_in_charge__icontains=value
        )
