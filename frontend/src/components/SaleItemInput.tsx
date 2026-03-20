"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';
import { SaleItem } from '@/types';
import { formatNumber } from '@/lib/utils';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';

interface SaleItemInputProps {
  item: SaleItem;
  index: number;
  onUpdate: (index: number, item: SaleItem) => void;
  onRemove: (index: number) => void;
}

const SaleItemInput: React.FC<SaleItemInputProps> = ({
  item,
  index,
  onUpdate,
  onRemove,
}) => {
  const { settings } = useBusinessSettings();
  const currency = settings.currency || 'USD';
  
  // Calculate the total for this item
  const subtotal = item.price * item.quantity;
  const discountAmount = (subtotal * (item.discountPercentage || 0)) / 100;
  const itemTotal = subtotal - discountAmount;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const updatedItem = {
      ...item,
      [name]: name === 'description' ? value : value === '' ? '' : Number(value),
    };
    onUpdate(index, updatedItem);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium">Item {index + 1}</h3>
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

      <div className="space-y-2">
        <Label htmlFor={`description-${index}`}>Description</Label>
        <Textarea
          id={`description-${index}`}
          name="description"
          value={item.description}
          onChange={handleChange}
          placeholder="Item or service description"
        />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`quantity-${index}`}>Quantity</Label>
          <Input
            id={`quantity-${index}`}
            name="quantity"
            type="number"
            min="0.01"
            step="0.01"
            value={item.quantity}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`price-${index}`}>Price per unit</Label>
          <Input
            id={`price-${index}`}
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={item.price === 0 ? '' : item.price}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`discount-${index}`}>Discount (%)</Label>
          <Input
            id={`discount-${index}`}
            name="discountPercentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={item.discountPercentage === 0 || item.discountPercentage === undefined ? '' : item.discountPercentage}
            onChange={handleChange}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`cost-${index}`}>Cost per unit</Label>
          <Input
            id={`cost-${index}`}
            name="cost"
            type="number"
            min="0"
            step="0.01"
            value={item.cost === 0 ? '' : item.cost}
            onChange={handleChange}
          />
          <p className="text-xs text-muted-foreground">(Internal use only)</p>
        </div>
      </div>

      {/* Item Total */}
      <div className="pt-2 border-t mt-2">
        <div className="flex justify-end items-center space-y-1 flex-col">
          {(item.discountPercentage || 0) > 0 && (
            <div className="flex justify-end items-center w-full">
              <span className="text-xs text-muted-foreground mr-2">Subtotal:</span>
              <span className="text-xs text-muted-foreground line-through">
                {currency} {formatNumber(subtotal)}
              </span>
            </div>
          )}
          {(item.discountPercentage || 0) > 0 && (
            <div className="flex justify-end items-center w-full">
              <span className="text-xs text-green-600 mr-2">Discount ({item.discountPercentage}%):</span>
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

export default SaleItemInput;
