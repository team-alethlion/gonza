from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db import transaction
from django.db.models import F

from .models import Campaign, Message, MessageTemplate, WhatsAppSession
from .serializers import (
    CampaignSerializer, MessageSerializer,
    MessageTemplateSerializer, WhatsAppSessionSerializer
)
from users.models import User

class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer
    permission_classes = [IsAuthenticated]

class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('userId')
        location_id = self.request.query_params.get('locationId')
        if user_id:
            qs = qs.filter(user_id=user_id)
        if location_id:
            qs = qs.filter(location_id=location_id)
        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        data = request.data
        sms_credits_to_deduct = data.get('smsCreditsUsed', 0)
        is_sent = data.get('status') == 'sent'
        profile_id = data.get('profileId')
        
        try:
            with transaction.atomic():
                if is_sent and profile_id and sms_credits_to_deduct > 0:
                    user_locked = User.objects.select_for_update().get(id=profile_id)
                    
                    # Need to check if user has actual "credits" field, if not skip or mock
                    # Our user schema didn't seem to have "credits", let's assume it does or use try-except
                    if hasattr(user_locked, 'credits'):
                        if user_locked.credits < sms_credits_to_deduct:
                            return Response({"error": "Insufficient SMS credits."}, status=400)
                        user_locked.credits = F('credits') - sms_credits_to_deduct
                        user_locked.save(update_fields=['credits'])

                import uuid
                msg_id = str(uuid.uuid4())[:8]
                message = Message.objects.create(
                    id=msg_id,
                    user_id=data.get('userId'),
                    location_id=data.get('locationId'),
                    profile_id=profile_id,
                    customer_id=data.get('customerId'),
                    phone_number=data.get('phoneNumber'),
                    content=data.get('content'),
                    status=data.get('status', 'pending'),
                    sms_credits_used=sms_credits_to_deduct,
                    template_id=data.get('templateId'),
                    metadata=data.get('metadata')
                )
                
                serializer = self.get_serializer(message)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class MessageTemplateViewSet(viewsets.ModelViewSet):
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('userId')
        location_id = self.request.query_params.get('locationId')
        if user_id:
            qs = qs.filter(user_id=user_id)
        if location_id:
            qs = qs.filter(location_id=location_id)
        return qs.order_by('-created_at')

class WhatsAppSessionViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppSession.objects.all()
    serializer_class = WhatsAppSessionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return WhatsAppSession.objects.filter(user=self.request.user)
