from rest_framework import serializers
from .models import Campaign, Message, MessageTemplate, WhatsAppSession

class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = '__all__'

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = '__all__'

class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = '__all__'

class WhatsAppSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppSession
        fields = '__all__'
