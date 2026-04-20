from django.db import models
from core.utils import gen_cp_id, gen_me_id, gen_mt_id, gen_ws_id
from .utils import encrypt_data, decrypt_data

class Campaign(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_cp_id)
    name = models.CharField(max_length=200, null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='campaigns')
    created_at = models.DateTimeField(auto_now_add=True)

class Message(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'), ('sent', 'Sent'), 
        ('failed', 'Failed'), ('delivered', 'Delivered')
    )
    CHANNEL_CHOICES = (
        ('sms', 'SMS'), ('whatsapp', 'WhatsApp'), ('both', 'Both')
    )

    id = models.CharField(max_length=30, primary_key=True, default=gen_me_id)
    content = models.TextField()
    recipient = models.CharField(max_length=200, null=True, blank=True)
    phone_number = models.CharField(max_length=50, null=True, blank=True)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='sms')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    media_url = models.URLField(max_length=500, null=True, blank=True)
    location_id = models.CharField(max_length=100, null=True, blank=True) # avoiding direct relation for flexibility
    profile_id = models.CharField(max_length=100, null=True, blank=True)
    customer = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')
    template_id = models.CharField(max_length=100, null=True, blank=True)
    
    metadata = models.JSONField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    sms_credits_used = models.IntegerField(default=0)
    
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='messages')
    campaign = models.ForeignKey(Campaign, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class MessageTemplate(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_mt_id)
    name = models.CharField(max_length=200)
    content = models.TextField()
    location_id = models.CharField(max_length=100, null=True, blank=True)
    category = models.CharField(max_length=100, null=True, blank=True)
    variables = models.JSONField(null=True, blank=True)
    is_default = models.BooleanField(default=False)
    
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='message_templates')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class WhatsAppSession(models.Model):
    id = models.CharField(max_length=30, primary_key=True, default=gen_ws_id)
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='whatsapp_session')
    status = models.CharField(max_length=50, default='disconnected') # "connected", "connecting", "disconnected"
    instance_name = models.CharField(max_length=100, unique=True, null=True, blank=True)
    session_data = models.TextField(null=True, blank=True)
    qr_code = models.TextField(null=True, blank=True)
    pairing_code = models.CharField(max_length=50, null=True, blank=True)
    linked_phone_number = models.CharField(max_length=50, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # 🛡️ SECURITY: Encrypt session_data if it's not already encrypted
        if self.session_data and not self.session_data.startswith('ENC:'):
            self.session_data = f"ENC:{encrypt_data(self.session_data)}"
        super().save(*args, **kwargs)

    def get_session_data(self):
        """
        Helper method to retrieve decrypted session data.
        """
        if self.session_data and self.session_data.startswith('ENC:'):
            return decrypt_data(self.session_data[4:])
        return self.session_data

    class Meta:
        verbose_name_plural = "WhatsApp Sessions"
