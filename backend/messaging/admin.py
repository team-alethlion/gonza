from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Campaign, Message, MessageTemplate, WhatsAppSession

@admin.register(Campaign)
class CampaignAdmin(ModelAdmin):
    list_display = ('name', 'user', 'created_at')

@admin.register(Message)
class MessageAdmin(ModelAdmin):
    list_display = ('recipient', 'phone_number', 'channel', 'status', 'created_at')
    list_filter = ('channel', 'status', 'created_at')
    search_fields = ('recipient', 'phone_number', 'content')

@admin.register(MessageTemplate)
class MessageTemplateAdmin(ModelAdmin):
    list_display = ('name', 'category', 'is_default')

@admin.register(WhatsAppSession)
class WhatsAppSessionAdmin(ModelAdmin):
    list_display = ('user', 'status', 'linked_phone_number')
