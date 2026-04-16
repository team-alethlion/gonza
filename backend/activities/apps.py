from django.apps import AppConfig

class ActivitiesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'activities'

    def ready(self):
        import activities.signals  # Connect signals
        
        # Initialize and register sources
        from .logic.sources.registry import registry
        from .logic.sources.sales_source import SalesSource
        from .logic.sources.finance_source import FinanceSource
        from .logic.sources.tasks_source import TasksSource
        from .logic.sources.inventory_source import InventorySource
        from .logic.sources.shadow_source import ShadowSource

        registry.register(SalesSource())
        registry.register(FinanceSource())
        registry.register(TasksSource())
        registry.register(InventorySource())
        registry.register(ShadowSource())
