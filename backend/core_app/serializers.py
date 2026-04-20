from rest_framework import serializers
from .models import (
    Agency, Branch, BranchSettings, Package
)

class PackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Package
        fields = '__all__'

class AgencySerializer(serializers.ModelSerializer):
    package = PackageSerializer(read_only=True)

    class Meta:
        model = Agency
        fields = '__all__'

class BranchSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BranchSettings
        fields = '__all__'

class BranchSerializer(serializers.ModelSerializer):
    agency = AgencySerializer(read_only=True)
    settings = BranchSettingsSerializer(read_only=True)
    managers = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = '__all__'

    def get_managers(self, obj):
        from users.models import User
        # Filter for users whose PRIMARY branch is this one
        managers = User.objects.filter(primary_branch=obj).exclude(role__name__iexact='admin')
        return [{
            "id": m.id,
            "name": m.name,
            "email": m.email,
            "status": m.status
        } for m in managers]

