from typing import Dict, Any, Optional
from .sources.registry import registry
from django.utils.timezone import now
from datetime import timedelta

def get_unified_stats(branch_id: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Combines counts from all sources for the summary cards.
    """
    sources = registry.get_all_sources()
    
    total_activities = 0
    module_distribution = []
    
    # Simple parallelism could be added here, but for now we iterate
    for source in sources:
        try:
            res = source.get_stats(branch_id, filters)
            count = res.get('count', 0)
            total_activities += count
            if count > 0:
                module_distribution.append({
                    "name": source.module_name,
                    "value": count
                })
        except Exception as e:
            print(f"[Aggregator] Source {source.module_name} stats failed: {e}")

    # 🚀 RECENT TREND pass: Calculate last 7 days
    recent_activities = 0
    seven_days_ago = (now() - timedelta(days=7)).isoformat()
    recent_filters = (filters.copy() if filters else {})
    recent_filters['dateFrom'] = seven_days_ago
    
    for source in sources:
        try:
            res = source.get_stats(branch_id, recent_filters)
            recent_activities += res.get('count', 0)
        except Exception:
            pass

    return {
        "total_activities": total_activities,
        "recent_activities": recent_activities,
        "module_distribution": sorted(module_distribution, key=lambda x: x['value'], reverse=True),
        "top_module": module_distribution[0]['name'] if module_distribution else "N/A"
    }
