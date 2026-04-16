from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import ActivityHistory

@admin.register(ActivityHistory)
class ActivityHistoryAdmin(ModelAdmin):
    list_display = ('activity_type', 'module', 'user', 'entity_name', 'created_at')
    list_filter = ('module', 'activity_type', 'branch')
    search_fields = ('entity_name', 'description')
    readonly_fields = ('created_at',)
