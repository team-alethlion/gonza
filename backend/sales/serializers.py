from rest_framework import serializers
from .models import SalesGoal, SaleCategory, Sale, SaleItem, InstallmentPayment

class SalesGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesGoal
        fields = '__all__'

class SaleCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleCategory
        fields = '__all__'

class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = '__all__'

class InstallmentPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstallmentPayment
        fields = '__all__'

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    installments = InstallmentPaymentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Sale
        fields = '__all__'
