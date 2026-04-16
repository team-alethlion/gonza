from django.db import models
from core.utils import gen_tc_id, gen_ta_id

class TaskCategory(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_tc_id)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='task_categories')
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='task_categories')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('branch', 'name')
        verbose_name_plural = "Task Categories"

class Task(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ta_id)
    created_by = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='tasks_created')
    branch = models.ForeignKey('core_app.Branch', on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    priority = models.CharField(max_length=50, default='medium')
    due_date = models.DateTimeField()
    category = models.CharField(max_length=100, null=True, blank=True)
    
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    reminder_enabled = models.BooleanField(default=False)
    reminder_time = models.CharField(max_length=50, null=True, blank=True)
    
    is_recurring = models.BooleanField(default=False)
    recurrence_type = models.CharField(max_length=50, null=True, blank=True)
    recurrence_end_date = models.DateTimeField(null=True, blank=True)
    parent_task_id = models.CharField(max_length=30, null=True, blank=True)
    recurrence_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Tasks"
