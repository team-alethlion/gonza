from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SupplierViewSet, CategoryViewSet, ProductViewSet,
    StockAuditViewSet, ProductHistoryViewSet, StockTransferViewSet,
    RequisitionViewSet
)

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'stock-audits', StockAuditViewSet, basename='stock-audit')
router.register(r'producthistory', ProductHistoryViewSet, basename='product-history')
router.register(r'stock-transfers', StockTransferViewSet, basename='stock-transfer')
router.register(r'requisitions', RequisitionViewSet, basename='requisition')
urlpatterns = [
    path('', include(router.urls)),
]
