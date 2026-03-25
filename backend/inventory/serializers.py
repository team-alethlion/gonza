from rest_framework import serializers
from .models import (
    Supplier, Category, Product, StockAudit, StockAuditItem,
    ProductHistory, StockTransfer, StockTransferItem,
    Requisition, RequisitionItem
)

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    # Optional nested serialization for category/supplier might be needed later
    class Meta:
        model = Product
        fields = '__all__'

        
class StockAuditItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockAuditItem
        fields = '__all__'

class StockAuditSerializer(serializers.ModelSerializer):
    items = StockAuditItemSerializer(many=True, read_only=True)
    class Meta:
        model = StockAudit
        fields = '__all__'

class ProductHistorySerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_cost = serializers.ReadOnlyField(source='product.cost_price')
    product_price = serializers.ReadOnlyField(source='product.selling_price')
    product_sku = serializers.ReadOnlyField(source='product.sku')

    class Meta:
        model = ProductHistory
        fields = '__all__'


class StockTransferItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockTransferItem
        fields = '__all__'

class StockTransferSerializer(serializers.ModelSerializer):
    items = StockTransferItemSerializer(many=True, read_only=True)
    class Meta:
        model = StockTransfer
        fields = '__all__'


class RequisitionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequisitionItem
        fields = '__all__'

class RequisitionSerializer(serializers.ModelSerializer):
    items = RequisitionItemSerializer(many=True, read_only=True)
    class Meta:
        model = Requisition
        fields = '__all__'

