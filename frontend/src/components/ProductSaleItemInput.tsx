"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Eye, EyeOff, Eraser } from 'lucide-react';
import { SaleItem } from '@/types';
import { formatNumber, formatNumberInput, parseNumberInput } from '@/lib/utils';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Product } from '@/types';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import ProductImage from '@/components/inventory/ProductImage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useLocalProductSearch, useLocalProduct } from '@/hooks/useProductSync';
// Removed direct Supabase import

import { matchProductSearch } from '@/utils/searchUtils';
import { useFinancialVisibility } from '@/hooks/useFinancialVisibility';
import { AlertCircle } from 'lucide-react';

interface ProductSaleItemInputProps {
  item: SaleItem;
  index: number;
  onUpdate: (index: number, item: SaleItem) => void;
  onRemove: (index: number) => void;
  saleDate?: string;
}

const ProductSaleItemInput: React.FC<ProductSaleItemInputProps> = ({
  item,
  index,
  onUpdate,
  onRemove,
  saleDate
}) => {
  const {
    settings
  } = useBusinessSettings();
  const currency = settings.currency || 'USD';
  const {
    user
  } = useAuth();
  const { currentBusiness } = useBusiness();
  const { canViewCostPrice, canViewSellingPrice, formatFinancial } = useFinancialVisibility();
  const [newProductName, setNewProductName] = useState<string>(item.description || '');
  const isMobile = useIsMobile();
  const [costVisible, setCostVisible] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Local state for numeric inputs with smart formatting (commas + decimals)
  const [quantityInput, setQuantityInput] = useState(formatNumberInput(item.quantity?.toString() || '0'));
  const [priceInput, setPriceInput] = useState(formatNumberInput(item.price?.toString() || '0'));
  const [costInput, setCostInput] = useState(formatNumberInput(item.cost?.toString() || '0'));
  const [discountAmountInput, setDiscountAmountInput] = useState(formatNumberInput(item.discountAmount?.toString() || '0'));
  const [discountPercentInput, setDiscountPercentInput] = useState(formatNumberInput(item.discountPercentage?.toString() || '0'));

  // Debounce search term to prevent filtering on every keystroke
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(item.description || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(newProductName);
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [newProductName]);

  // Use Local Dexie search instead of React Query + allProducts
  const filteredProducts = useLocalProductSearch(debouncedSearchTerm) || [];
  
  // ⚡️ TRACKED PRODUCT: Get the currently selected product details from local DB
  const matchedProduct = useLocalProduct(item.productId);
  
  const isUntied = !!newProductName.trim() && !item.productId;
  const isOverselling = matchedProduct && item.quantity > matchedProduct.quantity;

  // Update state when item changes (important for edit mode or external updates)
  useEffect(() => {
    const nextName = item.description || '';
    const nextQty = item.quantity === 0 ? '' : item.quantity.toString();
    const nextPrice = item.price === 0 ? '' : item.price.toString();
    const nextCost = item.cost === 0 ? '' : item.cost.toString();
    const nextDisc = item.discountAmount?.toString() || '0';
    const nextDiscPercent = item.discountPercentage?.toString() || '0';

    // Batch these updates asynchronously to avoid cascading renders
    const timer = setTimeout(() => {
      // Only update if the value from props is different from current state
      // We parse the current input to compare numeric values correctly
      setNewProductName(prev => prev !== nextName ? nextName : prev);
      
      setQuantityInput(prev => {
        const currentVal = parseFloat(prev.replace(/,/g, '')) || 0;
        return Math.abs(currentVal - item.quantity) > 0.001 ? nextQty : prev;
      });

      setPriceInput(prev => {
        const currentVal = parseFloat(prev.replace(/,/g, '')) || 0;
        return Math.abs(currentVal - item.price) > 0.001 ? nextPrice : prev;
      });

      setCostInput(prev => {
        const currentVal = parseFloat(prev.replace(/,/g, '')) || 0;
        return Math.abs(currentVal - item.cost) > 0.001 ? nextCost : prev;
      });

      setDiscountAmountInput(prev => {
        const currentVal = parseFloat(prev.replace(/,/g, '')) || 0;
        return Math.abs(currentVal - (item.discountAmount || 0)) > 0.001 ? nextDisc : prev;
      });

      setDiscountPercentInput(prev => {
        const currentVal = parseFloat(prev.replace(/,/g, '')) || 0;
        return Math.abs(currentVal - (item.discountPercentage || 0)) > 0.001 ? nextDiscPercent : prev;
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [item.description, item.quantity, item.price, item.cost, item.discountAmount, item.discountPercentage]);


  // Calculate the total for this item
  const subtotal = item.price * item.quantity;
  const discountAmount = item.discountType === 'amount'
    ? (item.discountAmount || 0)
    : (subtotal * (item.discountPercentage || 0)) / 100;
  const itemTotal = subtotal - discountAmount;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {
      name,
      value
    } = e.target;

    if (name === 'description') {
      setNewProductName(value);
      // Show suggestions when typing in the description field
      setShowSuggestions(value.trim() !== '');
      return;
    }

    // Handle numeric inputs with smart formatting (commas + decimals)
    const formatted = formatNumberInput(value);
    const numValue = parseNumberInput(value);

    if (name === 'quantity') {
      setQuantityInput(formatted);
      onUpdate(index, { ...item, quantity: numValue });
      return;
    }

    if (name === 'price') {
      setPriceInput(formatted);
      onUpdate(index, { ...item, price: numValue });
      return;
    }

    if (name === 'cost') {
      setCostInput(formatted);
      onUpdate(index, { ...item, cost: numValue });
      return;
    }

    if (name === 'discountAmount') {
      setDiscountAmountInput(formatted);
      onUpdate(index, { ...item, discountAmount: numValue });
      return;
    }

    if (name === 'discountPercentage') {
      setDiscountPercentInput(formatted);
      onUpdate(index, { ...item, discountPercentage: numValue });
      return;
    }

    // Default fallback
    const updatedItem = {
      ...item,
      [name]: numValue
    };
    onUpdate(index, updatedItem);
  };

  const handleDescriptionBlur = () => {
    if (newProductName !== item.description) {
      onUpdate(index, { ...item, description: newProductName });
    }
  };


  const handleTotalCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseNumberInput(e.target.value);
    // If setting total cost, we calculate unit cost
    const quantity = item.quantity || 1;
    const newUnitCost = value / quantity;

    // Update local state for cost with formatting
    setCostInput(formatNumberInput(newUnitCost.toString()));

    const updatedItem = {
      ...item,
      cost: newUnitCost
    };
    onUpdate(index, updatedItem);
  };

  // Toggle cost visibility
  const toggleCostVisibility = () => {
    setCostVisible(!costVisible);
  };

  // Handle clear form button click
  const handleClearForm = () => {
    // Reset states
    setNewProductName('');
    setShowSuggestions(false);

    // Keep current quantity but reset everything else
    const currentQuantity = item.quantity;
    const clearedItem = {
      ...item,
      description: '',
      price: 0,
      cost: 0,
      productId: undefined,
      discountAmount: 0,
      discountPercentage: 0
    };

    // Explicitly set inputs
    setPriceInput('0');
    setCostInput('0');
    setDiscountAmountInput('0');
    setDiscountPercentInput('0');
    // Quantity input stays same as current valid quantity
    // setQuantityInput(currentQuantity.toString()); 

    // Update the item
    onUpdate(index, clearedItem);

    toast.success('Item cleared');
  };

  // Handle product selection from suggestions
  const handleProductSelect = (product: Product) => {
    setNewProductName(product.name);
    setShowSuggestions(false);

    // Update local inputs with formatting
    setPriceInput(formatNumberInput(product.sellingPrice.toString()));
    setCostInput(formatNumberInput(product.costPrice.toString()));

    const updatedItem = {
      ...item,
      description: product.name,
      price: product.sellingPrice,
      cost: product.costPrice,
      productId: product.id
    };
    onUpdate(index, updatedItem);
  };

  // Check if selected product was created after the sale date
  const selectedProduct = item.productId ? filteredProducts.find(p => p.id === item.productId) : null;
  const showDateWarning = selectedProduct && saleDate && (() => {
    const productCreatedDate = new Date(selectedProduct.createdAt);
    const saleDateOnly = new Date(saleDate).setHours(0, 0, 0, 0);
    const productCreatedDateOnly = new Date(productCreatedDate.getFullYear(), productCreatedDate.getMonth(), productCreatedDate.getDate()).getTime();
    return productCreatedDateOnly > saleDateOnly;
  })();

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium">Item {index + 1}</h3>
        <div className="flex space-x-2">
          {/* Clear form button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearForm}
            className="text-gray-600 hover:text-gray-800"
          >
            <Eraser className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Clear</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Remove Item</span>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`description-${index}`} className="text-sm font-medium">Product / Service</Label>
        <div className="flex space-x-2">
          <div className="flex-grow relative">
            <Textarea
              id={`description-${index}`}
              name="description"
              value={newProductName}
              onChange={handleChange}
              placeholder="Enter product name"
              onFocus={() => newProductName.trim() !== '' && setShowSuggestions(true)}
              onBlur={handleDescriptionBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  document.getElementById(`quantity-${index}`)?.focus();
                }
              }}
              className={isMobile ? "min-h-16 text-base" : ""}
            />

            {/* Warnings */}
            <div className="mt-1 space-y-1">
              {isUntied && (
                <div className="flex items-center text-[10px] sm:text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                  <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>Not linked to inventory. Stock will not be tracked.</span>
                </div>
              )}
              {isOverselling && (
                <div className="flex items-center text-[10px] sm:text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                  <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>Selling more than available ({matchedProduct?.quantity} in stock).</span>
                </div>
              )}
            </div>

            {/* Display auto-suggestions when typing */}
            {showSuggestions && newProductName.trim() !== '' && filteredProducts.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                    onClick={() => handleProductSelect(product)}
                  >
                    <div className="flex items-center">
                      <ProductImage imageUrl={product.imageUrl} alt={product.name} size="sm" />
                      <div className="ml-3">
                        <div className="font-medium flex items-center gap-2">
                          {product.name}
                          {product.category && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-gray-100 text-gray-500 font-normal">
                              {product.category}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {canViewSellingPrice ? `${currency} ${product.sellingPrice.toFixed(2)}` : 'Price Hidden'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs">
                      {parseFloat(product.quantity.toFixed(5)).toString()} in stock
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Date warning */}
          {showDateWarning && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700 font-medium">
                🚫 Error: This product was created after the sale date. The sale cannot be created or updated.
              </p>
              <p className="text-xs text-red-600 mt-1">
                Please adjust the sale date or select a different product to continue.
              </p>
            </div>
          )}
        </div>
      </div>

      {isMobile ? (
        // Mobile layout: 2x2 grid for better touch experience
        <div className="space-y-4">
          {/* First row: Quantity and Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`quantity-${index}`} className="text-sm font-medium">Quantity</Label>
              <Input
                id={`quantity-${index}`}
                name="quantity"
                type="text"
                inputMode="decimal"
                value={quantityInput}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById(`price-${index}`)?.focus();
                  }
                }}
                className="h-12 text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`price-${index}`} className="text-sm font-medium">Price per unit</Label>
              <Input
                id={`price-${index}`}
                name="price"
                type="text"
                inputMode="decimal"
                value={priceInput}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const nextField = document.getElementById(`price-${index}`) as HTMLElement;
                    nextField?.focus();
                  }
                }}
                className="h-12 text-lg"
              />
            </div>
          </div>


          {/* Second row: Discount and Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Discount</Label>
                <select
                  value={item.discountType || 'percentage'}
                  onChange={(e) => {
                    const discountType = e.target.value as 'percentage' | 'amount';
                    const updatedItem = { ...item, discountType };
                    if (discountType === 'percentage') {
                      updatedItem.discountAmount = 0;
                      setDiscountAmountInput('0');
                    } else {
                      updatedItem.discountPercentage = 0;
                      setDiscountPercentInput('0');
                    }
                    onUpdate(index, updatedItem);
                  }}
                  className="flex-shrink-0 w-12 h-8 text-xs border border-input bg-background px-1 rounded-md"
                >
                  <option value="percentage">%</option>
                  <option value="amount">{currency}</option>
                </select>
              </div>
              <Input
                name={item.discountType === 'amount' ? 'discountAmount' : 'discountPercentage'}
                type="text"
                inputMode="decimal"
                value={item.discountType === 'amount' ? discountAmountInput : discountPercentInput}
                onChange={handleChange}
                placeholder="0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('taxRate')?.focus();
                  }
                }}
                className="h-12 text-lg"
              />
            </div>

            {canViewCostPrice && (
              <div className="space-y-2">
                <Collapsible open={costVisible} onOpenChange={setCostVisible}>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-500">
                      Cost Info
                    </Label>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                        {costVisible ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor={`cost-${index}`} className="text-xs text-gray-500">Cost per unit</Label>
                      <Input
                        id={`cost-${index}`}
                        name="cost"
                        type="text"
                        inputMode="decimal"
                        value={costInput}
                        onChange={handleChange}
                        className="h-12 text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`total-cost-${index}`} className="text-xs text-gray-500">Total Cost</Label>
                      <Input
                        id={`total-cost-${index}`}
                        name="totalCost"
                        type="text"
                        inputMode="decimal"
                        value={formatNumber(item.cost * item.quantity)}
                        onChange={handleTotalCostChange}
                        className="h-12 text-lg font-semibold bg-gray-50"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">(Internal use only)</p>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Desktop layout: Original 4-column grid
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`quantity-${index}`}>Quantity</Label>
            <Input
              id={`quantity-${index}`}
              name="quantity"
              type="text"
              inputMode="decimal"
              value={quantityInput}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  document.getElementById(`price-${index}`)?.focus();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`price-${index}`}>Price per unit</Label>
            <Input
              id={`price-${index}`}
              name="price"
              type="text"
              inputMode="decimal"
              value={priceInput}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const nextField = document.querySelector(`input[name="${item.discountType === 'amount' ? 'discountAmount' : 'discountPercentage'}"]`) as HTMLElement;
                  nextField?.focus();
                }
              }}
            />
          </div>


          <div className="space-y-2">
            <Label>Discount</Label>
            <div className="flex gap-1">
              <select
                value={item.discountType || 'percentage'}
                onChange={(e) => {
                  const discountType = e.target.value as 'percentage' | 'amount';
                  const updatedItem = { ...item, discountType };
                  if (discountType === 'percentage') {
                    updatedItem.discountAmount = 0;
                    setDiscountAmountInput('0');
                  } else {
                    updatedItem.discountPercentage = 0;
                    setDiscountPercentInput('0');
                  }
                  onUpdate(index, updatedItem);
                }}
                className="flex-shrink-0 w-12 text-xs border border-input bg-background px-1 py-2 rounded-md"
              >
                <option value="percentage">%</option>
                <option value="amount">{currency}</option>
              </select>
              <Input
                name={item.discountType === 'amount' ? 'discountAmount' : 'discountPercentage'}
                type="text"
                inputMode="decimal"
                value={item.discountType === 'amount' ? discountAmountInput : discountPercentInput}
                onChange={handleChange}
                placeholder="0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('taxRate')?.focus();
                  }
                }}
                className="flex-1"
              />
            </div>
          </div>

          {canViewCostPrice && (
            <div className="space-y-2">
              <Popover>
                <div className="flex items-center justify-between">
                  <Label className="text-gray-500">
                    Cost Info
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                            <Eye className="h-4 w-4 text-gray-500" />
                          </Button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click to view/edit cost</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <PopoverContent className="w-64 p-4 bg-white shadow-xl border">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`cost-popover-${index}`} className="text-xs">Cost per unit</Label>
                      <Input
                        id={`cost-popover-${index}`}
                        name="cost"
                        type="text"
                        inputMode="decimal"
                        value={costInput}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`total-cost-popover-${index}`} className="text-xs">Total Cost (for {item.quantity} units)</Label>
                      <Input
                        id={`total-cost-popover-${index}`}
                        name="totalCost"
                        type="text"
                        value={formatNumber(item.cost * item.quantity)}
                        onChange={handleTotalCostChange}
                        className="font-bold bg-gray-50"
                      />
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-[10px] text-muted-foreground">Costs entered here only apply to this specific sale and do not change the product's base price in inventory.</p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      )}

      {/* Item Total */}
      <div className="pt-2 border-t mt-2">
        <div className="flex justify-end items-center space-y-1 flex-col">
          {((item.discountPercentage || 0) > 0 || (item.discountAmount || 0) > 0) && (
            <div className="flex justify-end items-center w-full">
              <span className="text-xs text-muted-foreground mr-2">Subtotal:</span>
              <span className="text-xs text-muted-foreground line-through">
                {currency} {formatNumber(subtotal)}
              </span>
            </div>
          )}
          {((item.discountPercentage || 0) > 0 || (item.discountAmount || 0) > 0) && (
            <div className="flex justify-end items-center w-full">
              <span className="text-xs text-green-600 mr-2">
                Discount {item.discountType === 'amount' ? '' : `(${item.discountPercentage}%)`}:
              </span>
              <span className="text-xs text-green-600">
                -{currency} {formatNumber(discountAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-end items-center w-full">
            <span className="text-sm font-medium mr-2">Total:</span>
            <span className="text-sm font-bold">
              {currency} {formatNumber(itemTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSaleItemInput;
