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
    image = serializers.URLField(write_only=True, required=False)

    class Meta:
        model = Product
        fields = '__all__'

    def validate(self, data):
        # Handle backward compatibility: if 'image' is provided but 'image_url' is not
        if 'image' in data and not data.get('image_url'):
            data['image_url'] = data.pop('image')
        elif 'image' in data:
            data.pop('image') # redundant if image_url is also present
            
        """
        Check that the product name is unique within the branch.
        """
        name = data.get('name')
        branch = data.get('branch')
        
        # When creating a new product or updating the name of an existing one
        if name and branch:
            from django.utils.text import slugify
            slug = slugify(name)
            
            # Exclude the current instance if it's an update
            queryset = Product.objects.filter(branch=branch, slug=slug)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
                
            if queryset.exists():
                raise serializers.ValidationError({
                    "name": f"A product with the name '{name}' already exists in this branch."
                })
                
        return data

        
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

