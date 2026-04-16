from typing import List, Dict, Any, Optional
from .base import BaseHistorySource
from ...models import ActivityHistory
from django.db.models import Q

class ShadowSource(BaseHistorySource):
    @property
    def module_name(self) -> str:
        return 'SYSTEM'

    def get_events(self, branch_id: str, last_timestamp: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        events = []
        
        qs = ActivityHistory.objects.filter(branch_id=branch_id).select_related('user')
        if last_timestamp:
            qs = qs.filter(created_at__lt=last_timestamp)
            
        for log in qs.order_by('-created_at')[:limit]:
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
                "profile_name": log.profile_name or (f"{log.user.first_name} {log.user.last_name}".strip() or log.user.email)
            })

        return sorted(events, key=lambda x: x['created_at'], reverse=True)[:limit]

    def get_stats(self, branch_id: str, date_from: Optional[str] = None, date_to: Optional[str] = None) -> Dict[str, Any]:
        qs = ActivityHistory.objects.filter(branch_id=branch_id)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)
            
        return {
            "count": qs.count(),
            "module": self.module_name
        }
