from django_filters import rest_framework as filters
from django.db.models import Q
from .models import ActivityHistory

class ActivityHistoryFilter(filters.FilterSet):
    activityType = filters.CharFilter(field_name='activity_type')
    module = filters.CharFilter(field_name='module')
    dateFrom = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    dateTo = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    search = filters.CharFilter(method='filter_search')
    locationId = filters.CharFilter(field_name='branch_id')
    userId = filters.CharFilter(field_name='user_id')

    class Meta:
        model = ActivityHistory
        fields = ['activityType', 'module', 'locationId', 'userId']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(description__icontains=value) |
            Q(entity_name__icontains=value) |
            Q(profile_name__icontains=value)
        )
