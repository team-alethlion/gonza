from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ActivityHistory
from .serializers import ActivityHistorySerializer
from .logic.merger import get_unified_history_stream
from .logic.aggregator import get_unified_stats

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

    def list(self, request, *args, **kwargs):
        """
        🚀 REFACTORED: Dynamic stream merge instead of single table fetch.
        """
        branch_id = self.request.query_params.get('locationId') or self.request.user.branch_id
        if not branch_id:
            return Response({"error": "locationId is required"}, status=400)
            
        last_timestamp = self.request.query_params.get('last_timestamp')
        limit = int(self.request.query_params.get('limit', 50))
        
        # Extract filters
        filters = {
            'activityType': self.request.query_params.get('activityType'),
            'module': self.request.query_params.get('module'),
            'search': self.request.query_params.get('search'),
            'dateFrom': self.request.query_params.get('dateFrom'),
            'dateTo': self.request.query_params.get('dateTo'),
            'userId': self.request.query_params.get('userId')
        }
        
        unified_list = get_unified_history_stream(
            branch_id=branch_id,
            last_timestamp=last_timestamp,
            limit=limit,
            filters=filters
        )
        
        return Response({
            "results": unified_list,
            "count": len(unified_list)
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        🚀 REFACTORED: Aggregates across all source modules.
        """
        branch_id = self.request.query_params.get('locationId') or self.request.user.branch_id
        if not branch_id:
            return Response({"error": "locationId is required"}, status=400)
            
        # Extract filters
        filters = {
            'activityType': self.request.query_params.get('activityType'),
            'module': self.request.query_params.get('module'),
            'dateFrom': self.request.query_params.get('dateFrom'),
            'dateTo': self.request.query_params.get('dateTo'),
            'userId': self.request.query_params.get('userId')
        }

        data = get_unified_stats(
            branch_id=branch_id,
            filters=filters
        )
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
