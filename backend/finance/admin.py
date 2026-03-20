from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import CashAccount, CashTransaction, ExpenseCategory, Expense, Transaction, CarriageInward

@admin.register(CashAccount)
class CashAccountAdmin(ModelAdmin):
    list_display = ('name', 'current_balance', 'branch', 'is_active', 'is_default')
    list_filter = ('branch', 'is_active')

@admin.register(CashTransaction)
class CashTransactionAdmin(ModelAdmin):
    list_display = ('id', 'amount', 'transaction_type', 'date', 'account', 'branch')
    list_filter = ('transaction_type', 'date', 'branch')

@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(ModelAdmin):
    list_display = ('name', 'branch', 'is_default')

@admin.register(Expense)
class ExpenseAdmin(ModelAdmin):
    list_display = ('description', 'amount', 'category', 'date', 'branch')
    list_filter = ('category', 'date', 'branch')

@admin.register(Transaction)
class TransactionAdmin(ModelAdmin):
    list_display = ('pesapal_merchant_reference', 'amount', 'status', 'type', 'created_at')
    list_filter = ('status', 'type', 'created_at')

@admin.register(CarriageInward)
class CarriageInwardAdmin(ModelAdmin):
    list_display = ('supplier_name', 'amount', 'date', 'branch')
    list_filter = ('date', 'branch')
