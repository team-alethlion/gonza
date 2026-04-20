from typing import List, Dict, Any, Optional
from .base import BaseHistorySource
from tasks.models import Task
from django.db.models import Q

class TasksSource(BaseHistorySource):
    @property
    def module_name(self) -> str:
        return 'TASKS'

    def get_events(self, branch_id: str, last_timestamp: Optional[str] = None, limit: int = 50, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        # 🚀 SMART FILTER: Skip if module filter is active and not TASKS
        if filters and filters.get('module') and filters.get('module') != 'TASKS' and filters.get('module') != 'ALL':
            return []

        events = []
        search = filters.get('search') if filters else None
        date_from = filters.get('dateFrom') if filters else None
        date_to = filters.get('dateTo') if filters else None
        act_type = filters.get('activityType') if filters else None
        
        # 1. Fetch Task Creations/Updates
        tasks_qs = Task.objects.filter(branch_id=branch_id).select_related('created_by')
        if last_timestamp:
            tasks_qs = tasks_qs.filter(created_at__lt=last_timestamp)
        if date_from:
            tasks_qs = tasks_qs.filter(created_at__gte=date_from)
        if date_to:
            tasks_qs = tasks_qs.filter(created_at__lte=date_to)
        if search:
            tasks_qs = tasks_qs.filter(
                Q(title__icontains=search) | Q(description__icontains=search) | Q(category__icontains=search)
            )
            
        for task in tasks_qs.order_by('-created_at')[:limit]:
            # Creation event (Only if type is ALL or CREATE)
            if not act_type or act_type in ['ALL', 'CREATE']:
                events.append(self.normalize_event(
                    item=task,
                    activity_type='CREATE',
                    description=f"Created task: {task.title} (Priority: {task.priority})",
                    entity_name=task.title,
                    entity_type='task'
                ))

            # Completion event (Only if type is ALL or UPDATE)
            if task.completed and task.completed_at:
                if not act_type or act_type in ['ALL', 'UPDATE']:
                     events.append({
                        "id": f"comp_{task.id}",
                        "activity_type": 'UPDATE',
                        "module": self.module_name,
                        "entity_type": 'task',
                        "entity_id": task.id,
                        "entity_name": task.title,
                        "description": f"Completed task: {task.title}",
                        "created_at": task.completed_at.isoformat(),
                        "profile_name": f"{task.created_by.first_name} {task.created_by.last_name}".strip() or task.created_by.email
                    })

        return sorted(events, key=lambda x: x['created_at'], reverse=True)[:limit]

    def get_stats(self, branch_id: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if filters and filters.get('module') and filters.get('module') != 'TASKS' and filters.get('module') != 'ALL':
            return {"count": 0, "module": self.module_name}

        qs = Task.objects.filter(branch_id=branch_id)
        date_from = filters.get('dateFrom') if filters else None
        date_to = filters.get('dateTo') if filters else None
        
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)
            
        return {
            "count": qs.count(),
            "module": self.module_name
        }
