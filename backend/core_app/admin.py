from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Agency, Branch, Package, SubscriptionTransaction, BranchSettings, Task, ActivityHistory

@admin.register(Agency)
class AgencyAdmin(ModelAdmin):
    list_display = ('name', 'subscription_status', 'package', 'trial_end_date', 'is_onboarded')
    list_filter = ('subscription_status', 'package', 'is_onboarded')
    search_fields = ('name',)

@admin.register(Branch)
class BranchAdmin(ModelAdmin):
    list_display = ('name', 'agency', 'type', 'location', 'admin')
    list_filter = ('type', 'agency')
    search_fields = ('name', 'location')

@admin.register(Package)
class PackageAdmin(ModelAdmin):
    list_display = ('name', 'monthly_price', 'max_locations', 'is_active')
    list_filter = ('is_active',)

@admin.register(SubscriptionTransaction)
class SubscriptionTransactionAdmin(ModelAdmin):
    list_display = ('id', 'agency', 'amount', 'status', 'created_at')
    list_filter = ('status', 'billing_cycle')

@admin.register(BranchSettings)
class BranchSettingsAdmin(ModelAdmin):
    list_display = ('branch', 'business_name', 'currency')

@admin.register(Task)
class TaskAdmin(ModelAdmin):
    list_display = ('title', 'branch', 'priority', 'due_date', 'completed')
    list_filter = ('priority', 'completed', 'branch')

@admin.register(ActivityHistory)
class ActivityHistoryAdmin(ModelAdmin):
    list_display = ('activity_type', 'module', 'user', 'entity_name', 'created_at')
    list_filter = ('module', 'activity_type')
    readonly_fields = ('created_at',)
