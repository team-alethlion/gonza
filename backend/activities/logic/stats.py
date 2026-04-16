from django.db.models import Count, Q
from django.utils.timezone import now
from datetime import timedelta

def get_activity_stats(queryset, user):
    """
    Calculate pre-aggregated statistics for activity history.
    """
    total_count = queryset.count()
    
    # 1. Distribution by Type
    type_dist = queryset.values('activity_type').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # 2. Distribution by Module
    module_dist = queryset.values('module').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # 3. Recent trends (last 7 days)
    seven_days_ago = now() - timedelta(days=7)
    recent_count = queryset.filter(created_at__gte=seven_days_ago).count()

    return {
        "total_activities": total_count,
        "recent_activities": recent_count,
        "type_distribution": [
            {"name": item['activity_type'], "value": item['count']} 
            for item in type_dist
        ],
        "module_distribution": [
            {"name": item['module'], "value": item['count']} 
            for item in module_dist
        ],
        "top_module": module_dist[0]['module'] if module_dist else "N/A"
    }
