from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CampaignViewSet, MessageViewSet, 
    MessageTemplateViewSet, WhatsAppSessionViewSet
)

router = DefaultRouter()
router.register(r'campaigns', CampaignViewSet, basename='campaign')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'templates', MessageTemplateViewSet, basename='template')
router.register(r'whatsapp', WhatsAppSessionViewSet, basename='whatsapp-session')

urlpatterns = [
    path('', include(router.urls)),
]
