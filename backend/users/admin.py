from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from unfold.admin import ModelAdmin
from .models import User, Role, Permission

@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    list_display = ('email', 'role', 'agency', 'branch', 'status', 'is_staff')
    list_filter = ('status', 'role', 'is_staff', 'is_superuser')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone', 'image')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Workplace', {'fields': ('agency', 'branch', 'credits', 'pin')}),
        ('Important dates', {'fields': ('last_login', 'date_joined', 'last_seen')}),
    )

@admin.register(Role)
class RoleAdmin(ModelAdmin):
    list_display = ('name', 'branch', 'created_at')
    search_fields = ('name',)

@admin.register(Permission)
class PermissionAdmin(ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)
