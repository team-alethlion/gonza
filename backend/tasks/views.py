import uuid
from django.utils.timezone import now
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Q

from .models import Task, TaskCategory
from .serializers import TaskSerializer, TaskCategorySerializer
from .logic.tasks import get_task_stats, get_recent_tasks

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        from dateutil.relativedelta import relativedelta
        task = serializer.save()
        
        if task.is_recurring and task.recurrence_type and task.recurrence_end_date:
            current_date = task.due_date
            end_date = task.recurrence_end_date
            count = 1
            
            delta = None
            if task.recurrence_type == 'daily':
                delta = relativedelta(days=1)
            elif task.recurrence_type == 'weekly':
                delta = relativedelta(weeks=1)
            elif task.recurrence_type == 'monthly':
                delta = relativedelta(months=1)
                
            if delta:
                while count < 1000:
                    current_date += delta
                    if current_date > end_date:
                        break
                        
                    Task.objects.create(
                        id=f"ts_{uuid.uuid4().hex[:12]}",
                        created_by=task.created_by,
                        branch=task.branch,
                        title=task.title,
                        description=task.description,
                        priority=task.priority,
                        due_date=current_date,
                        category=task.category,
                        reminder_enabled=task.reminder_enabled,
                        reminder_time=task.reminder_time,
                        is_recurring=False,
                        parent_task_id=task.id,
                        recurrence_count=count
                    )
                    count += 1

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('userId')
        branch_id = self.request.query_params.get('locationId') or self.request.query_params.get('branchId')
        
        if user_id:
            qs = qs.filter(created_by_id=user_id)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
            
        status_filter = self.request.query_params.get('status')
        if status_filter == 'completed':
            qs = qs.filter(completed=True)
        elif status_filter == 'pending':
            qs = qs.filter(completed=False)
            
        priority = self.request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority__iexact=priority)
            
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__iexact=category)
            
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search) |
                Q(category__icontains=search)
            )
            
        return qs.order_by('due_date', '-created_at')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        data = get_task_stats(queryset, request.user)
        data['recent_tasks'] = get_recent_tasks(queryset, limit=5)
        return Response(data)

    @action(detail=False, methods=['patch'])
    @transaction.atomic
    def bulk_update(self, request):
        ids = request.data.get('ids', [])
        updates = request.data.get('updates', {})
        if not ids:
            return Response({"error": "No IDs provided"}, status=400)
            
        mapped_updates = {}
        if 'completed' in updates: mapped_updates['completed'] = updates['completed']
        if 'completedAt' in updates: mapped_updates['completed_at'] = updates['completedAt']
        if 'priority' in updates: mapped_updates['priority'] = updates['priority']
        
        Task.objects.filter(id__in=ids).update(**mapped_updates)
        return Response({"status": "updated", "count": len(ids)})

    @action(detail=False, methods=['delete'])
    @transaction.atomic
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({"error": "No IDs provided"}, status=400)
            
        deleted, _ = Task.objects.filter(id__in=ids).delete()
        return Response({"status": "deleted", "count": deleted})

class TaskCategoryViewSet(viewsets.ModelViewSet):
    queryset = TaskCategory.objects.all()
    serializer_class = TaskCategorySerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def bulk_create(self, request):
        names = request.data.get('names', [])
        branch_id = request.data.get('branch')
        user_id = request.data.get('user') or request.user.id
        
        created = []
        for name in names:
            obj, _ = TaskCategory.objects.get_or_create(
                name=name,
                branch_id=branch_id,
                defaults={'user_id': user_id}
            )
            created.append(obj)
            
        return Response(self.get_serializer(created, many=True).data, status=201)

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('userId')
        branch_id = self.request.query_params.get('locationId')
        if user_id and user_id != 'ALL':
            qs = qs.filter(user_id=user_id)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs.order_by('name')

    def perform_create(self, serializer):
        user_id = self.request.data.get('user')
        branch_id = self.request.data.get('branch')
        serializer.save(
            user_id=user_id or self.request.user.id,
            branch_id=branch_id
        )
