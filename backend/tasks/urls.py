from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, TaskCategoryViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet)
router.register(r'task-categories', TaskCategoryViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
