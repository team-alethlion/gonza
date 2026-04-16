from django.db import models
from core.utils import gen_ah_id

class ActivityHistory(models.Model):
    ACTIVITY_TYPES = [
        ('CREATE', 'Created'),
        ('UPDATE', 'Updated'),
        ('DELETE', 'Deleted'),
    ]
    
    MODULES = [
        ('SALES', 'Sales'),
        ('INVENTORY', 'Inventory'),
        ('EXPENSES', 'Expenses'),
        ('FINANCE', 'Finance'),
        ('CUSTOMERS', 'Customers'),
        ('TASKS', 'Tasks'),
    ]

    id = models.CharField(max_length=30, primary_key=True, default=gen_ah_id)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='activity_logs')
    agency = models.ForeignKey('core_app.Agency', on_delete=models.CASCADE, related_name='activity_logs', null=True, blank=True)
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='activity_logs', null=True, blank=True)
    
    activity_type = models.CharField(max_length=100, choices=ACTIVITY_TYPES, db_index=True)
    module = models.CharField(max_length=100, choices=MODULES, db_index=True)
    
    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.CharField(max_length=100, null=True, blank=True)
    entity_name = models.CharField(max_length=200, db_index=True)
    description = models.TextField()
    
    metadata = models.JSONField(null=True, blank=True, default=dict)
    
    profile_id = models.CharField(max_length=30, null=True, blank=True)
    profile_name = models.CharField(max_length=200, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name_plural = "Activity History"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.activity_type} - {self.entity_name} ({self.created_at})"
