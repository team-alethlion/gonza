from django_filters import rest_framework as filters
from django.db.models import F, Q
from .models import Product

class ProductFilter(filters.FilterSet):
    stock_status = filters.CharFilter(method='filter_stock_status')
    category_name = filters.CharFilter(field_name='category__name', lookup_expr='icontains')
    
    class Meta:
        model = Product
        fields = {
            'branch': ['exact'],
            'branch_id': ['exact'],
            'category': ['exact'],
            'stock': ['exact', 'gt', 'lt', 'gte', 'lte'],
        }

    def filter_stock_status(self, queryset, name, value):
        if value == 'lowStock':
            return queryset.filter(stock__gt=0, stock__lte=F('min_stock'))
        elif value == 'outOfStock':
            return queryset.filter(stock__lte=0)
        elif value == 'inStock':
            return queryset.filter(stock__gt=0)
        return queryset
