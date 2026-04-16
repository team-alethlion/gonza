from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Task, TaskCategory

@admin.register(Task)
class TaskAdmin(ModelAdmin):
    list_display = ('title', 'branch', 'priority', 'due_date', 'completed')
    list_filter = ('priority', 'completed', 'branch')
    search_fields = ('title', 'description')

@admin.register(TaskCategory)
class TaskCategoryAdmin(ModelAdmin):
    list_display = ('name', 'branch', 'user')
    list_filter = ('branch',)
    search_fields = ('name',)
