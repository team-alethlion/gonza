from rest_framework import serializers
from .models import (
    Agency, Branch, BranchSettings, Package, Task, TaskCategory, ActivityHistory
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

    class Meta:
        model = Branch
        fields = '__all__'

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'

class TaskCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskCategory
        fields = '__all__'

class ActivityHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityHistory
        fields = '__all__'
