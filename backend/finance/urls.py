from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CashAccountViewSet, CashTransactionViewSet,
    ExpenseCategoryViewSet, ExpenseViewSet, TransactionViewSet,
    CarriageInwardViewSet
)

router = DefaultRouter()
router.register(r'accounts', CashAccountViewSet, basename='cash-account')
router.register(r'cash-transactions', CashTransactionViewSet, basename='cash-transaction')
router.register(r'categories', ExpenseCategoryViewSet, basename='expense-category')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'carriage-inwards', CarriageInwardViewSet, basename='carriage-inward')

urlpatterns = [
    path('', include(router.urls)),
]
