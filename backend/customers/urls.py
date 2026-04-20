from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomerCategoryViewSet, CustomerViewSet, 
    FavoriteCustomerViewSet, TicketViewSet,
    CustomerLedgerViewSet
)

router = DefaultRouter()
router.register(r'categories', CustomerCategoryViewSet, basename='customer-category')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'favorite-customers', FavoriteCustomerViewSet, basename='favorite-customer')
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'ledger', CustomerLedgerViewSet, basename='customer-ledger')

urlpatterns = [
    path('', include(router.urls)),
]
