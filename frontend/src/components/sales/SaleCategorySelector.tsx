"use client";
import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSalesCategories } from '@/hooks/useSalesCategories';
import { SalesCategory } from '@/types';

interface SaleCategorySelectorProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

const SaleCategorySelector: React.FC<SaleCategorySelectorProps> = ({
  value,
  onChange,
  label = "Sales Source",
  placeholder = "Select category (optional)"
}) => {
  const { categories, isLoading } = useSalesCategories();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Loading..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || "none"} onValueChange={(val) => {
        onChange(val === "none" ? "" : val);
      }}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No source</SelectItem>
          {categories.map((category: SalesCategory) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SaleCategorySelector;