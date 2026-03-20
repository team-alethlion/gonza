from django_filters import rest_framework as filters
from .models import Customer

class CustomerFilter(filters.FilterSet):
    search = filters.CharFilter(method='filter_search')
    category_name = filters.CharFilter(field_name='category__name', lookup_expr='icontains')

    class Meta:
        model = Customer
        fields = ['branch', 'category', 'gender']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            name__icontains=value
        ) | queryset.filter(
            phone__icontains=value
        ) | queryset.filter(
            email__icontains=value
        ) | queryset.filter(
            address__icontains=value
        )
