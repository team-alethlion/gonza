from django.db.models import Count, Q
from django.utils.timezone import now
from datetime import datetime

def get_task_stats(queryset, user):
    """
    Calculate pre-aggregated statistics for tasks.
    """
    today_start = now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_tasks = queryset.count()
    completed_tasks = queryset.filter(completed=True).count()
    
    # Using conditional aggregation for performance (single pass)
    counts = queryset.aggregate(
        today_total=Count('id', filter=Q(due_date__date=today_start.date())),
        today_completed=Count('id', filter=Q(due_date__date=today_start.date(), completed=True)),
        overdue=Count('id', filter=Q(due_date__lt=today_start, completed=False)),
        high_priority_pending=Count('id', filter=Q(priority='high', completed=False))
    )
    
    completion_rate = round((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0
    today_total = counts['today_total']
    today_completed = counts['today_completed']
    today_completion_rate = round((today_completed / today_total * 100)) if today_total > 0 else 0
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": total_tasks - completed_tasks,
        "today_tasks": today_total,
        "today_completed": today_completed,
        "overdue_tasks": counts['overdue'],
        "high_priority_pending": counts['high_priority_pending'],
        "completion_rate": completion_rate,
        "today_completion_rate": today_completion_rate,
    }

def get_recent_tasks(queryset, limit=5):
    """
    Get top N recent tasks.
    """
    from ..serializers import TaskSerializer
    recent_qs = queryset.order_by('-created_at')[:limit]
    return TaskSerializer(recent_qs, many=True).data
