from rest_framework import serializers
from .models import ActivityHistory

class ActivityHistorySerializer(serializers.ModelSerializer):
    profile_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityHistory
        fields = '__all__'
        read_only_fields = ['user', 'agency']

    def get_profile_name(self, obj):
        if obj.profile_name:
            return obj.profile_name
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
        return "System"
