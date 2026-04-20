import heapq
from typing import List, Dict, Any, Optional
from .sources.registry import registry

def get_unified_history_stream(branch_id: str, last_timestamp: Optional[str] = None, limit: int = 50, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    K-Way Merge algorithm to combine multiple sorted sources into one timeline.
    """
    sources = registry.get_all_sources()
    target_module = filters.get('module') if filters else None
    
    # 1. Fetch chunks from each source (O(K * limit))
    streams = []
    for source in sources:
        # 🚀 SMART SKIP: Only call sources that match the module filter
        # ShadowSource (SYSTEM) always runs as it contains deleted items from all modules
        if target_module and target_module != 'ALL' and source.module_name != 'SYSTEM':
            if source.module_name != target_module:
                # Special case: FINANCE module adapter handles both FINANCE and EXPENSES
                if target_module == 'EXPENSES' and source.module_name == 'FINANCE':
                    pass
                else:
                    continue

        try:
            events = source.get_events(branch_id, last_timestamp, limit, filters)
            if events:
                streams.append(events)
        except Exception as e:
            print(f"[Merger] Source {source.module_name} failed: {e}")

    # 2. Use heapq to merge pre-sorted lists efficiently (O(N log K))
    # We want descending order (newest first)
    unified_stream = heapq.merge(*streams, key=lambda x: x['created_at'], reverse=True)
    
    # 3. Return the first N items
    results = []
    try:
        for _ in range(limit):
            results.append(next(unified_stream))
    except StopIteration:
        pass
        
    return results
