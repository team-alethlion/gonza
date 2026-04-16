from typing import List, Dict, Any, Optional
from .base import BaseHistorySource
from tasks.models import Task
from django.db.models import Q

class TasksSource(BaseHistorySource):
    @property
    def module_name(self) -> str:
        return 'TASKS'

    def get_events(self, branch_id: str, last_timestamp: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        events = []
        
        # 1. Fetch Task Creations/Updates
        # Note: For tasks, we mostly care about when they were created or completed
        tasks_qs = Task.objects.filter(branch_id=branch_id).select_related('created_by')
        if last_timestamp:
            tasks_qs = tasks_qs.filter(created_at__lt=last_timestamp)
            
        for task in tasks_qs.order_by('-created_at')[:limit]:
            # Creation event
            events.append(self.normalize_event(
                item=task,
                activity_type='CREATE',
                description=f"Created task: {task.title} (Priority: {task.priority})",
                entity_name=task.title,
                entity_type='task'
            ))

            # If completed, also add completion event if it fits in timestamp range
            if task.completed and task.completed_at:
                 # Standardize to dict format directly since normalize_event uses .created_at
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

    def get_stats(self, branch_id: str, date_from: Optional[str] = None, date_to: Optional[str] = None) -> Dict[str, Any]:
        qs = Task.objects.filter(branch_id=branch_id)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)
            
        return {
            "count": qs.count(),
            "module": self.module_name
        }
