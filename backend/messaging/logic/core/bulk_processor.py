import logging
import threading
from django.db import transaction
from django.utils import timezone
from messaging.models import Message, MessageTemplate
from customers.models import Customer
from .credit_manager import CreditManager
from ..gateways.sms_gateway import SMSGateway
from ..gateways.whatsapp_gateway import WhatsAppGateway

logger = logging.getLogger(__name__)

class BulkProcessor:
    """
    🧠 BULK PROCESSOR
    Handles the expansion, personalization, and asynchronous sending of bulk messages.
    Supports multi-channel delivery (SMS/WhatsApp).
    """

    @staticmethod
    def process(user_id, branch_id, customer_ids, content=None, template_id=None, channel='sms'):
        """
        Main entry point for starting a bulk job.
        """
        # 1. Expand Customers
        customers = Customer.objects.filter(id__in=customer_ids, branch_id=branch_id)
        if not customers.exists():
            raise ValueError("No valid customers found for this branch.")

        # 2. WhatsApp Connection Check
        if channel == 'whatsapp':
            status = WhatsAppGateway.get_status(User.objects.get(id=user_id))
            if status.get('status') != 'connected':
                raise ValueError("WhatsApp is not connected. Please pair your device first.")

        # 3. Get Template if provided
        template = None
        if template_id:
            template = MessageTemplate.objects.get(id=template_id)
            final_content = template.content
        else:
            final_content = content

        if not final_content:
            raise ValueError("Message content or template is required.")

        # 4. Estimate Credits
        # In a professional setup, WhatsApp might be free or have a different unit cost.
        # For now, we use the same credit logic for simplicity.
        msg_len = len(final_content)
        credits_per_msg = max(1, (msg_len // 160) + (1 if msg_len % 160 > 0 else 0))
        total_estimated_credits = credits_per_msg * customers.count()

        # 5. Check Credits
        if not CreditManager.can_afford(user_id, total_estimated_credits):
            raise ValueError(f"Insufficient credits. Need ~{total_estimated_credits}, have less.")

        # 6. Spawn Background Worker
        thread = threading.Thread(
            target=BulkProcessor._background_worker,
            args=(user_id, branch_id, list(customers.values('id', 'name', 'phone')), final_content, credits_per_msg, channel)
        )
        thread.start()

        return {
            "queued_count": customers.count(),
            "estimated_credits": total_estimated_credits,
            "channel": channel
        }

    @staticmethod
    def _background_worker(user_id, branch_id, customers_data, raw_content, credits_per_msg, channel):
        """
        Processes the queue item by item.
        """
        logger.info(f"[BulkProcessor] 🚀 Background worker started for {len(customers_data)} {channel.upper()} messages.")
        
        user = User.objects.get(id=user_id)

        for data in customers_data:
            cust_id = data['id']
            cust_name = data['name']
            phone = data['phone']

            if not phone:
                continue

            # Personalize
            content = raw_content.replace("{customer_name}", cust_name).replace("{{customer_name}}", cust_name)
            
            # Deduct Credits
            if not CreditManager.deduct(user_id, credits_per_msg, reason=f"Bulk {channel.upper()} to {cust_name}"):
                logger.error(f"[BulkProcessor] ❌ Failed to deduct credits for customer {cust_id}. Skipping.")
                continue

            try:
                # Dispatch based on channel
                if channel == 'whatsapp':
                    result = WhatsAppGateway.send_message(user, phone, content)
                else:
                    result = SMSGateway.send(phone, content)
                
                if result['success']:
                    # Create Message Record ONLY ON SUCCESS
                    Message.objects.create(
                        content=content,
                        recipient=cust_name,
                        phone_number=phone,
                        status=result['status'],
                        sms_credits_used=credits_per_msg,
                        channel=channel,
                        user_id=user_id,
                        location_id=branch_id,
                        customer_id=cust_id,
                        sent_at=timezone.now()
                    )
                else:
                    logger.warning(f"[BulkProcessor] 🚫 Delivery failed for {cust_name} ({phone}). Skipping DB record. Error: {result.get('error')}")
                    # Refund if failed definitively
                    CreditManager.refund(user_id, credits_per_msg, reason=f"Failed {channel.upper()} to {cust_name}")

            except Exception as e:
                logger.error(f"[BulkProcessor] ❌ Error sending {channel} message to {cust_id}: {str(e)}")
                # Refund on crash
                CreditManager.refund(user_id, credits_per_msg, reason=f"System error during {channel} to {cust_name}")

        logger.info(f"[BulkProcessor] ✅ Background worker finished ({channel.upper()}).")
