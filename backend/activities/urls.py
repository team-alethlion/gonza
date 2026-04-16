from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ActivityHistoryViewSet

router = DefaultRouter()
router.register(r'logs', ActivityHistoryViewSet, basename='activity-history')

urlpatterns = [
    path('', include(router.urls)),
]
