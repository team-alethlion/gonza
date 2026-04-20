from typing import List, Type
from .base import BaseHistorySource

class SourceRegistry:
    """
    Registry for Smart History sources.
    Uses the Singleton pattern to ensure all parts of the app use the same sources.
    """
    _instance = None
    _sources: List[BaseHistorySource] = []

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SourceRegistry, cls).__new__(cls)
        return cls._instance

    def register(self, source: BaseHistorySource):
        """Register a new history source adapter."""
        # Prevent duplicates
        if any(s.module_name == source.module_name for s in self._sources):
            return
        self._sources.append(source)

    def get_all_sources(self) -> List[BaseHistorySource]:
        """Returns all registered sources."""
        return self._sources

# Global registry instance
registry = SourceRegistry()
