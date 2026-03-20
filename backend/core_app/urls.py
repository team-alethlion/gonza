from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AgencyViewSet, BranchViewSet, BranchSettingsViewSet, PackageViewSet,
    SubscriptionTransactionViewSet, TaskViewSet, TaskCategoryViewSet,
    ActivityHistoryViewSet, AnalyticsViewSet, CronJobViewSet
)

router = DefaultRouter()
router.register(r'agencies', AgencyViewSet, basename='agency')
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'settings', BranchSettingsViewSet, basename='branch-settings')
router.register(r'packages', PackageViewSet, basename='package')
router.register(r'subscriptions', SubscriptionTransactionViewSet, basename='subscription')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'task-categories', TaskCategoryViewSet, basename='task-category')
router.register(r'activity-history', ActivityHistoryViewSet, basename='activity-history')
router.register(r'analytics', AnalyticsViewSet, basename='analytics')
router.register(r'crons', CronJobViewSet, basename='crons')

urlpatterns = [
    path('', include(router.urls)),
]
