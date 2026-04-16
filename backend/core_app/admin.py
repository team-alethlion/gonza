from django.contrib import admin
from django.db.models import Count
from unfold.admin import ModelAdmin, StackedInline
from .models import Agency, Branch, Package, SubscriptionTransaction, BranchSettings, AgencyRoleDirectory
from users.models import Role

@admin.register(AgencyRoleDirectory)
class AgencyRoleDirectoryAdmin(ModelAdmin):
    list_display = ('name', 'roles_count', 'manage_link')
    search_fields = ('name',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(role_count=Count('roles'))

    def roles_count(self, obj):
        return obj.role_count
    roles_count.short_description = 'Total Roles'

    def manage_link(self, obj):
        from django.utils.html import format_html
        from django.urls import reverse
        url = f"{reverse('admin:users_role_changelist')}?agency__id__exact={obj.id}"
        return format_html('<a href="{}" class="font-bold text-blue-600">Open Folder</a>', url)
    
    manage_link.short_description = 'Actions'

    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False

class RoleStackedInline(StackedInline):
    model = Role
    extra = 0
    fields = ('id', 'name', 'description', 'pin_required', 'is_system_role')
    readonly_fields = ('id',)
    show_change_link = True

@admin.register(Agency)
class AgencyAdmin(ModelAdmin):
    list_display = ('name', 'subscription_status', 'package', 'trial_end_date', 'is_onboarded', 'manage_roles_link')
    list_filter = ('subscription_status', 'package', 'is_onboarded')
    search_fields = ('name',)
    inlines = [RoleStackedInline]

    def manage_roles_link(self, obj):
        from django.utils.html import format_html
        from django.urls import reverse
        url = f"{reverse('admin:users_role_changelist')}?agency__id__exact={obj.id}"
        return format_html('<a href="{}" class="font-bold text-blue-600 hover:text-blue-800">Manage Roles</a>', url)
    
    manage_roles_link.short_description = 'Roles'

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

