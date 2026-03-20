from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import SalesGoal, SaleCategory, Sale, SaleItem, InstallmentPayment

class SaleItemInline(TabularInline):
    model = SaleItem
    extra = 0

@admin.register(SalesGoal)
class SalesGoalAdmin(ModelAdmin):
    list_display = ('branch', 'user', 'amount_target', 'current_amount', 'period', 'status')
    list_filter = ('status', 'period', 'branch')

@admin.register(SaleCategory)
class SaleCategoryAdmin(ModelAdmin):
    list_display = ('name', 'branch', 'user')

@admin.register(Sale)
class SaleAdmin(ModelAdmin):
    list_display = ('receipt_number', 'total_amount', 'status', 'date', 'branch', 'customer')
    list_filter = ('status', 'payment_method', 'branch', 'date')
    search_fields = ('receipt_number', 'customer__name')
    inlines = [SaleItemInline]

@admin.register(InstallmentPayment)
class InstallmentPaymentAdmin(ModelAdmin):
    list_display = ('sale', 'amount', 'date', 'payment_method', 'status')
    list_filter = ('status', 'payment_method', 'branch')
