import heapq
from typing import List, Dict, Any, Optional
from .sources.registry import registry

def get_unified_history_stream(branch_id: str, last_timestamp: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """
    K-Way Merge algorithm to combine multiple sorted sources into one timeline.
    """
    sources = registry.get_all_sources()
    
    # 1. Fetch chunks from each source (O(K * limit))
    streams = []
    for source in sources:
        try:
            events = source.get_events(branch_id, last_timestamp, limit)
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
