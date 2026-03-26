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
    unit_price = serializers.FloatField()
    subtotal = serializers.FloatField()
    total = serializers.FloatField()
    cost_price = serializers.FloatField()
    
    class Meta:
        model = SaleItem
        fields = '__all__'

class InstallmentPaymentSerializer(serializers.ModelSerializer):
    amount = serializers.FloatField()
    
    class Meta:
        model = InstallmentPayment
        fields = '__all__'

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    installments = InstallmentPaymentSerializer(many=True, read_only=True)
    receipt_url = serializers.SerializerMethodField()
    
    subtotal = serializers.FloatField()
    discount_amount = serializers.FloatField()
    tax_amount = serializers.FloatField()
    total_amount = serializers.FloatField()
    total_cost = serializers.FloatField()
    profit = serializers.FloatField()
    amount_paid = serializers.FloatField()
    balance_due = serializers.FloatField()
    
    class Meta:
        model = Sale
        fields = '__all__'

    def get_receipt_url(self, obj):
        request = self.context.get('request')
        if request and obj.id:
            # We assume the standard DRF routing for the receipt_pdf action
            # /api/sales/sales/{id}/receipt_pdf/
            from django.urls import reverse
            try:
                return request.build_absolute_uri(
                    reverse('sale-receipt-pdf', kwargs={'pk': obj.pk})
                )
            except:
                # Fallback to manual string construction if reverse fails
                return request.build_absolute_uri(f"/api/sales/sales/{obj.pk}/receipt_pdf/")
        return None
