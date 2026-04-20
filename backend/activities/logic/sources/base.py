from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from django.db.models import QuerySet

class BaseHistorySource(ABC):
    """
    Abstract base class for all Smart History sources.
    Every source must implement methods to return standardized activity dictionaries.
    """
    
    @property
    @abstractmethod
    def module_name(self) -> str:
        """Returns the module identifier (e.g., 'SALES', 'TASKS')"""
        pass

    @abstractmethod
    def get_events(self, branch_id: str, agency_id: str, last_timestamp: Optional[str] = None, limit: int = 50, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Fetches activities from the primary table.
        Must return a list of dictionaries matching the Unified History Schema.
        """
        pass

    @abstractmethod
    def get_stats(self, branch_id: str, agency_id: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Returns counts for the statistical aggregator.
        """
        pass

    def normalize_event(self, item: Any, activity_type: str, description: str, entity_name: str, entity_type: str) -> Dict[str, Any]:
        """
        Helper to map raw model instances to the standard frontend-ready dictionary.
        """
        # Note: 'item' should have been fetched with select_related('user')
        profile_name = "System"
        if hasattr(item, 'user') and item.user:
            profile_name = f"{item.user.first_name} {item.user.last_name}".strip() or item.user.email
        elif hasattr(item, 'created_by') and item.created_by:
             profile_name = f"{item.created_by.first_name} {item.created_by.last_name}".strip() or item.created_by.email

        return {
            "id": item.id,
            "activity_type": activity_type,
            "module": self.module_name,
            "entity_type": entity_type,
            "entity_id": item.id,
            "entity_name": entity_name,
            "description": description,
            "created_at": item.created_at.isoformat() if hasattr(item, 'created_at') else item.date.isoformat(),
            "profile_name": profile_name
        }
