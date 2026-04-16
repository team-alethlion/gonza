from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ActivityHistory
from .serializers import ActivityHistorySerializer
from .logic.stats import get_activity_stats

from django_filters.rest_framework import DjangoFilterBackend
from .filters import ActivityHistoryFilter

class ActivityHistoryViewSet(viewsets.ModelViewSet):
    queryset = ActivityHistory.objects.all()
    serializer_class = ActivityHistorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = ActivityHistoryFilter

    def perform_create(self, serializer):
        # 🛡️ SECURITY: Auto-assign user, branch, and agency from request
        user = self.request.user
        branch_id = self.request.data.get('branch') or user.branch_id
        
        serializer.save(
            user=user,
            branch_id=branch_id,
            agency_id=user.agency_id
        )

    def get_queryset(self):
        # Base isolation
        return super().get_queryset().order_by('-created_at')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        # Apply filters to stats too
        queryset = self.filter_queryset(self.get_queryset())
        data = get_activity_stats(queryset, request.user)
        return Response(data)

    @action(detail=False, methods=['post'])
    def activity_cleanup(self, request):
        from django.utils.timezone import now
        from dateutil.relativedelta import relativedelta
        
        # Default to 90 days if not provided
        days = int(request.data.get('days', 90))
        cutoff_date = now() - relativedelta(days=days)
        
        deleted, _ = ActivityHistory.objects.filter(created_at__lt=cutoff_date).delete()
        return Response({
            "success": True, 
            "message": f"Deleted {deleted} activities older than {days} days."
        })
