from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import CustomerCategory, Customer, FavoriteCustomer, Ticket

@admin.register(CustomerCategory)
class CustomerCategoryAdmin(ModelAdmin):
    list_display = ('name', 'branch', 'is_default')

@admin.register(Customer)
class CustomerAdmin(ModelAdmin):
    list_display = ('name', 'phone', 'email', 'branch', 'category')
    list_filter = ('branch', 'category', 'gender')
    search_fields = ('name', 'phone', 'email')

@admin.register(FavoriteCustomer)
class FavoriteCustomerAdmin(ModelAdmin):
    list_display = ('user', 'customer', 'created_at')

@admin.register(Ticket)
class TicketAdmin(ModelAdmin):
    list_display = ('title', 'customer', 'type', 'priority', 'status')
    list_filter = ('type', 'priority', 'status')
    search_fields = ('title', 'customer__name')
