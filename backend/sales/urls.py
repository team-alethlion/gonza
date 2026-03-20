from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SalesGoalViewSet, SaleCategoryViewSet,
    SaleViewSet, SaleItemViewSet, InstallmentPaymentViewSet
)

router = DefaultRouter()
router.register(r'goals', SalesGoalViewSet, basename='sales-goal')
router.register(r'categories', SaleCategoryViewSet, basename='sale-category')
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'items', SaleItemViewSet, basename='sale-item')
router.register(r'installments', InstallmentPaymentViewSet, basename='installment')

urlpatterns = [
    path('', include(router.urls)),
]
