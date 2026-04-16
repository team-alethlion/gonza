from django.core.cache import cache
from typing import Dict, Any, Optional

def get_cached_stats(branch_id: str, filter_key: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves stats from cache for a specific branch and filter set.
    """
    key = f"activity_stats_{branch_id}_{filter_key}"
    return cache.get(key)

def set_cached_stats(branch_id: str, filter_key: str, data: Dict[str, Any], timeout: int = 300):
    """
    Stores stats in cache with a 5-minute default timeout.
    """
    key = f"activity_stats_{branch_id}_{filter_key}"
    cache.set(key, data, timeout)

def invalidate_stats_cache(branch_id: str):
    """
    Clears stats cache for a branch. 
    Should be called on CREATE/UPDATE/DELETE.
    """
    # Simple pattern-based clearing if supported by backend, 
    # otherwise we use specific keys or a versioning system.
    # For now, we'll use a branch-specific version tag.
    version_key = f"activity_stats_version_{branch_id}"
    cache.incr(version_key, ignore_failures=True)
    if not cache.get(version_key):
        cache.set(version_key, 1)
