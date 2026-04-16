from typing import Dict, Any, Optional
from .sources.registry import registry
from django.utils.timezone import now
from datetime import timedelta

def get_unified_stats(branch_id: str, date_from: Optional[str] = None, date_to: Optional[str] = None) -> Dict[str, Any]:
    """
    Combines counts from all sources for the summary cards.
    """
    sources = registry.get_all_sources()
    
    total_activities = 0
    module_distribution = []
    
    # Simple parallelism could be added here, but for now we iterate
    for source in sources:
        try:
            res = source.get_stats(branch_id, date_from, date_to)
            count = res.get('count', 0)
            total_activities += count
            if count > 0:
                module_distribution.append({
                    "name": source.module_name,
                    "value": count
                })
        except Exception as e:
            print(f"[Aggregator] Source {source.module_name} stats failed: {e}")

    # Calculate recent trend (hardcoded for 7 days in stats.py normally)
    # For now, we reuse the total or add a custom 7-day fetch if needed.
    
    return {
        "total_activities": total_activities,
        "recent_activities": total_activities, # Fallback or implementation specific
        "module_distribution": sorted(module_distribution, key=lambda x: x['value'], reverse=True),
        "top_module": module_distribution[0]['name'] if module_distribution else "N/A"
    }
