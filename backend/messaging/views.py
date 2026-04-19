from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db import transaction
from django.db.models import F, Q, Count, Sum

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

from .logic.core.bulk_processor import BulkProcessor
from .logic.core.credit_manager import CreditManager
from .logic.gateways.sms_gateway import SMSGateway

import logging
logger = logging.getLogger(__name__)

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

    @action(detail=False, methods=['post'])
    def bulk_send(self, request):
        """
        🚀 BULK SEND ENGINE
        Triggers an asynchronous bulk messaging job.
        """
        data = request.data
        user_id = request.user.id
        branch_id = data.get('locationId')
        customer_ids = data.get('customerIds', [])
        content = data.get('content')
        template_id = data.get('templateId')
        channel = data.get('channel', 'sms')

        if not branch_id or not customer_ids:
            return Response({"error": "branchId and customerIds are required"}, status=400)

        try:
            result = BulkProcessor.process(
                user_id=user_id,
                branch_id=branch_id,
                customer_ids=customer_ids,
                content=content,
                template_id=template_id,
                channel=channel
            )
            return Response(result, status=status.HTTP_202_ACCEPTED)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        except Exception as e:
            return Response({"error": "Critical error starting bulk job"}, status=500)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        📊 MESSAGING STATS
        Returns optimized counts for the branch.
        """
        location_id = request.query_params.get('locationId')
        if not location_id:
            return Response({"error": "locationId required"}, status=400)

        from django.db.models import Count, Sum
        stats = Message.objects.filter(location_id=location_id).aggregate(
            total=Count('id'),
            sent=Count('id', filter=Q(status='sent') | Q(status='delivered')),
            failed=Count('id', filter=Q(status='failed')),
            pending=Count('id', filter=Q(status='pending')),
            credits_used=Sum('sms_credits_used')
        )

        # Include remaining credits for the current user
        stats['credits_remaining'] = getattr(request.user, 'credits', 0)

        return Response(stats)

    def create(self, request, *args, **kwargs):
        data = request.data
        user = request.user
        branch_id = data.get('locationId')
        channel = data.get('channel', 'sms')
        phone = data.get('phoneNumber')
        content = data.get('content')
        
        if not phone or not content:
            return Response({"error": "phoneNumber and content are required"}, status=400)

        # 1. Estimate Credits
        msg_len = len(content)
        credits_needed = max(1, (msg_len // 160) + (1 if msg_len % 160 > 0 else 0))

        # 2. Pre-check Credits
        if not CreditManager.can_afford(user.id, credits_needed):
            return Response({"error": "Insufficient SMS credits."}, status=400)

        try:
            # 3. Call Gateway FIRST
            if channel == 'whatsapp':
                wa_status = WhatsAppGateway.get_status(user)
                if wa_status.get('status') != 'connected':
                    return Response({"error": "WhatsApp is not connected. Pair your device first."}, status=400)
                result = WhatsAppGateway.send_message(user, phone, content)
            else:
                result = SMSGateway.send(phone, content)

            # 🚀 TRANS-SAFE: If gateway failed, do NOT record in database
            if not result['success']:
                logger.warning(f"[MessageViewSet] 🚫 Gateway failed. Skipping database record. Error: {result.get('error')}")
                return Response({
                    "success": False,
                    "error": result.get('error') or "Gateway rejected the message."
                }, status=status.HTTP_400_BAD_REQUEST)

            # 4. Atomic Processing of Record + Credits (ONLY ON SUCCESS)
            with transaction.atomic():
                if not CreditManager.deduct(user.id, credits_needed, reason=f"Individual {channel.upper()} to {phone}"):
                        return Response({"error": "Failed to deduct credits."}, status=500)
                
                import uuid
                msg_id = str(uuid.uuid4())[:8]
                message = Message.objects.create(
                    id=msg_id,
                    user=user,
                    location_id=branch_id,
                    customer_id=data.get('customerId'),
                    phone_number=phone,
                    content=content,
                    status=result['status'],
                    channel=channel,
                    sms_credits_used=credits_needed,
                    template_id=data.get('templateId'),
                    metadata=result
                )
                
                serializer = self.get_serializer(message)
                return Response({
                    "success": True,
                    "message": serializer.data
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"[MessageViewSet] ❌ Critical error in create: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data
        new_status = data.get('status')
        old_status = instance.status
        profile_id = instance.profile_id or data.get('profileId')
        
        # 🛡️ SMS CREDIT REFUND/DEDUCTION LOGIC
        # We need to capture changes to message status to ensure accurate credit management.
        
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        
        if profile_id:
            try:
                # 1. REFUND LOGIC: If message was 'sent' (credits deducted) and now 'failed'
                if old_status == 'sent' and new_status == 'failed':
                    if message.sms_credits_used > 0:
                        user_locked = User.objects.select_for_update().get(id=profile_id)
                        if hasattr(user_locked, 'credits'):
                            user_locked.credits = F('credits') + message.sms_credits_used
                            user_locked.save(update_fields=['credits'])
                            # Optional: Mark as refunded? For now, we rely on status change
                
                # 2. DEDUCTION LOGIC: If message wasn't 'sent' and now is
                elif old_status != 'sent' and new_status == 'sent':
                    sms_credits_to_deduct = data.get('smsCreditsUsed') or message.sms_credits_used
                    if sms_credits_to_deduct > 0:
                        user_locked = User.objects.select_for_update().get(id=profile_id)
                        if hasattr(user_locked, 'credits'):
                            if user_locked.credits < sms_credits_to_deduct:
                                raise Exception("Insufficient SMS credits to update to 'sent'.")
                            user_locked.credits = F('credits') - sms_credits_to_deduct
                            user_locked.save(update_fields=['credits'])
                            
                            # Ensure the message record matches the deduction
                            if message.sms_credits_used != sms_credits_to_deduct:
                                message.sms_credits_used = sms_credits_to_deduct
                                message.save(update_fields=['sms_credits_used'])
                                
            except User.DoesNotExist:
                pass
            except Exception as e:
                # Re-raise to trigger transaction rollback
                raise e
                
        return Response(self.get_serializer(message).data)

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

from .logic.gateways.whatsapp_gateway import WhatsAppGateway

class WhatsAppSessionViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppSession.objects.all()
    serializer_class = WhatsAppSessionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return WhatsAppSession.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def status(self, request):
        """
        🔍 SESSION STATUS
        Returns real-time connection status and QR code if connecting.
        """
        status_data = WhatsAppGateway.get_status(request.user)
        return Response(status_data)

    @action(detail=False, methods=['post'])
    def initialize(self, request):
        """
        🔄 INITIALIZE SESSION
        Starts the connection process (QR or Pairing).
        """
        ptype = request.data.get('type', 'qr')
        phone = request.data.get('phoneNumber')
        session = WhatsAppGateway.initialize_session(request.user, ptype, phone)
        return Response(self.get_serializer(session).data)

    @action(detail=False, methods=['post'])
    def disconnect(self, request):
        """
        🔌 DISCONNECT
        Terminates the active WhatsApp instance.
        """
        success = WhatsAppGateway.disconnect(request.user)
        return Response({"status": "disconnected" if success else "failed"})
