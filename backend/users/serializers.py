from rest_framework import serializers
from .models import User, Role, Permission
from core_app.serializers import AgencySerializer, BranchSerializer

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = '__all__'

class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Role
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    agency = AgencySerializer(read_only=True)
    branch = BranchSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone', 
            'status', 'image', 'role', 'agency', 'branch', 
            'credits', 'is_onboarded', 'last_seen'
        ]
        read_only_fields = ['id']
