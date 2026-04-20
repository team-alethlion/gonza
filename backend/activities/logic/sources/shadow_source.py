from typing import List, Dict, Any, Optional
from .base import BaseHistorySource
from ...models import ActivityHistory
from django.db.models import Q

class ShadowSource(BaseHistorySource):
    @property
    def module_name(self) -> str:
        return 'SYSTEM'

    def get_events(self, branch_id: str, last_timestamp: Optional[str] = None, limit: int = 50, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        events = []
        
        qs = ActivityHistory.objects.filter(branch_id=branch_id).select_related('user')
        if last_timestamp:
            qs = qs.filter(created_at__lt=last_timestamp)
            
        if filters:
            if filters.get('userId') and filters.get('userId') != 'ALL':
                qs = qs.filter(user_id=filters.get('userId'))
            if filters.get('module') and filters.get('module') != 'ALL':
                qs = qs.filter(module=filters.get('module'))
            if filters.get('activityType') and filters.get('activityType') != 'ALL':
                qs = qs.filter(activity_type=filters.get('activityType'))
            if filters.get('dateFrom'):
                qs = qs.filter(created_at__gte=filters.get('dateFrom'))
            if filters.get('dateTo'):
                qs = qs.filter(created_at__lte=filters.get('dateTo'))
            if filters.get('search'):
                search = filters.get('search')
                qs = qs.filter(
                    Q(description__icontains=search) | 
                    Q(entity_name__icontains=search) |
                    Q(profile_name__icontains=search)
                )

        for log in qs.order_by('-created_at')[:limit]:
            profile_name = log.profile_name
            if not profile_name and log.user:
                profile_name = f"{log.user.first_name} {log.user.last_name}".strip() or log.user.email
            
            if not profile_name:
                profile_name = "System"

            # Directly map existing model fields
            events.append({
                "id": log.id,
                "activity_type": log.activity_type,
                "module": log.module,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "entity_name": log.entity_name,
                "description": log.description,
                "created_at": log.created_at.isoformat(),
                "profile_name": profile_name
            })

        return sorted(events, key=lambda x: x['created_at'], reverse=True)[:limit]

    def get_stats(self, branch_id: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        qs = ActivityHistory.objects.filter(branch_id=branch_id)
        
        if filters:
            if filters.get('userId') and filters.get('userId') != 'ALL':
                qs = qs.filter(user_id=filters.get('userId'))
            if filters.get('module') and filters.get('module') != 'ALL':
                qs = qs.filter(module=filters.get('module'))
            if filters.get('activityType') and filters.get('activityType') != 'ALL':
                qs = qs.filter(activity_type=filters.get('activityType'))
            if filters.get('dateFrom'):
                qs = qs.filter(created_at__gte=filters.get('dateFrom'))
            if filters.get('dateTo'):
                qs = qs.filter(created_at__lte=filters.get('dateTo'))
            
        return {
            "count": qs.count(),
            "module": self.module_name
        }
