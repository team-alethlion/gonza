from django_filters import rest_framework as filters
from .models import Sale

class SaleFilter(filters.FilterSet):
    date_from = filters.DateTimeFilter(field_name='date', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='date', lookup_expr='lte')
    status = filters.CharFilter(field_name='status')
    customer_id = filters.CharFilter(field_name='customer_id')
    search = filters.CharFilter(method='filter_search')

    class Meta:
        model = Sale
        fields = ['branch_id', 'status', 'customer', 'category']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            receipt_number__icontains=value
        ) | queryset.filter(
            customer_name__icontains=value
        ) | queryset.filter(
            notes__icontains=value
        )
