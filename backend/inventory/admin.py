from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import Supplier, Category, Product, StockAudit, StockAuditItem, ProductHistory, StockTransfer, StockTransferItem, Requisition, RequisitionItem

class StockAuditItemInline(TabularInline):
    model = StockAuditItem
    extra = 0

class StockTransferItemInline(TabularInline):
    model = StockTransferItem
    extra = 0

class RequisitionItemInline(TabularInline):
    model = RequisitionItem
    extra = 0

@admin.register(Supplier)
class SupplierAdmin(ModelAdmin):
    list_display = ('name', 'contact_name', 'phone', 'agency')
    search_fields = ('name', 'contact_name')

@admin.register(Category)
class CategoryAdmin(ModelAdmin):
    list_display = ('name', 'branch', 'agency')
    list_filter = ('branch', 'agency')

@admin.register(Product)
class ProductAdmin(ModelAdmin):
    list_display = ('name', 'sku', 'selling_price', 'stock', 'branch')
    list_filter = ('branch', 'category')
    search_fields = ('name', 'sku', 'barcode')
    readonly_fields = ('slug',)

@admin.register(StockAudit)
class StockAuditAdmin(ModelAdmin):
    list_display = ('audit_number', 'branch', 'status', 'date_started', 'total_variance')
    list_filter = ('status', 'branch')
    inlines = [StockAuditItemInline]

@admin.register(ProductHistory)
class ProductHistoryAdmin(ModelAdmin):
    list_display = ('product', 'type', 'quantity_change', 'new_stock', 'user', 'created_at')
    list_filter = ('type', 'created_at')
    readonly_fields = ('created_at',)

@admin.register(StockTransfer)
class StockTransferAdmin(ModelAdmin):
    list_display = ('transfer_number', 'from_branch', 'to_branch', 'status', 'date')
    list_filter = ('status', 'from_branch', 'to_branch')
    inlines = [StockTransferItemInline]

@admin.register(Requisition)
class RequisitionAdmin(ModelAdmin):
    list_display = ('requisition_number', 'branch', 'status', 'priority', 'date')
    list_filter = ('status', 'priority', 'branch')
    inlines = [RequisitionItemInline]
