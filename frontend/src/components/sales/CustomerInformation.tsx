"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Customer } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCustomerCategories } from "@/hooks/useCustomerCategories";

interface CustomerInformationProps {
  customerName: string;
  customerAddress: string;
  customerContact: string;
  notes?: string;
  onCustomerInfoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: {
    customerName?: string;
  };
  customers?: Customer[];
  onAddNewCustomer?: () => void;
  onSelectCustomer?: (customer: Customer) => void;
  selectedCategoryId?: string;
  onCategoryChange?: (categoryId: string) => void;
}

const CustomerInformation: React.FC<CustomerInformationProps> = ({
  customerName,
  customerAddress,
  customerContact,
  notes = '',
  onCustomerInfoChange,
  errors,
  customers = [],
  onAddNewCustomer,
  onSelectCustomer,
  selectedCategoryId,
  onCategoryChange,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCustomerCategory, setSelectedCustomerCategory] = useState<string>("");
  const { categories } = useCustomerCategories();

  // Filter customers based on search input
  const filteredCustomers = customers?.filter((customer) =>
    customer.fullName.toLowerCase().includes(searchValue.toLowerCase())
  ) || [];

  // Reset search value when customerName changes externally
  useEffect(() => {
    const syncStates = () => {
      if (searchValue !== customerName) {
        setSearchValue(customerName);
      }

      // Update customer category when customer name changes
      if (customerName.trim()) {
        const customer = customers.find(c => c.fullName === customerName);
        if (customer && customer.categoryId) {
          const category = categories.find(cat => cat.id === customer.categoryId);
          const categoryName = category?.name || "";
          if (selectedCustomerCategory !== categoryName) {
            setSelectedCustomerCategory(categoryName);
          }
        } else {
          if (selectedCustomerCategory !== "") setSelectedCustomerCategory("");
        }
      } else {
        if (selectedCustomerCategory !== "") setSelectedCustomerCategory("");
      }
    };

    const timer = setTimeout(syncStates, 0);
    return () => clearTimeout(timer);
  }, [customerName, customers, categories, searchValue, selectedCustomerCategory]);

  // Update selected category display when selectedCategoryId changes
  useEffect(() => {
    const syncCategory = () => {
      if (selectedCategoryId) {
        const category = categories.find(cat => cat.id === selectedCategoryId);
        const categoryName = category?.name || "";
        if (selectedCustomerCategory !== categoryName) {
          setSelectedCustomerCategory(categoryName);
        }
      } else {
        if (selectedCustomerCategory !== "") setSelectedCustomerCategory("");
      }
    };

    const timer = setTimeout(syncCategory, 0);
    return () => clearTimeout(timer);
  }, [selectedCategoryId, categories, selectedCustomerCategory]);

  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    setShowSuggestions(false);
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    }

    // Update category when customer is selected
    if (customer.categoryId) {
      const category = categories.find(cat => cat.id === customer.categoryId);
      setSelectedCustomerCategory(category?.name || "");
      if (onCategoryChange) {
        onCategoryChange(customer.categoryId);
      }
    } else {
      setSelectedCustomerCategory("");
      if (onCategoryChange) {
        onCategoryChange("");
      }
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onCustomerInfoChange(e);

    // Show suggestions when typing
    if (value.trim()) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSelectedCustomerCategory("");
      if (onCategoryChange) {
        onCategoryChange("");
      }
    }
  };

  // Handle blur event - hide suggestions after a delay
  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Handle category selection for new customers
  const handleCategorySelect = (categoryId: string) => {
    if (categoryId === "none") {
      setSelectedCustomerCategory("");
      if (onCategoryChange) {
        onCategoryChange("");
      }
    } else {
      const category = categories.find(cat => cat.id === categoryId);
      if (category) {
        setSelectedCustomerCategory(category.name);
        if (onCategoryChange) {
          onCategoryChange(categoryId);
        }
      }
    }
  };

  // Get category name by ID
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || null;
  };

  // Check if this is an existing customer (has a match in customers list)
  const isExistingCustomer = (customerName || '').trim() && customers.some(c => c.fullName === customerName);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Customer Information</h3>

      <div className="grid gap-3">
        <Label htmlFor="customerName">Customer Name</Label>
        <div className="flex flex-col space-y-2 relative">
          <Input
            id="customerName"
            name="customerName"
            value={customerName}
            onChange={handleSearchChange}
            onFocus={() => searchValue.trim() && setShowSuggestions(true)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('customerAddress')?.focus();
              }
            }}
            className={cn(
              errors.customerName ? 'border-red-500' : '',
              "w-full"
            )}
            placeholder="Start typing customer name..."
            autoComplete="off"
          />

          {/* Suggestions dropdown */}
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => {
                  const categoryName = getCategoryName(customer.categoryId || null);
                  return (
                    <div
                      key={customer.id}
                      className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b last:border-0 border-gray-100 dark:border-gray-700 transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent input blur from firing before selection
                        handleSelectCustomer(customer);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {customerName === customer.fullName && (
                              <Check className="h-4 w-4 text-green-500 shrink-0" />
                            )}
                            <span className="font-medium text-sm truncate uppercase tracking-tight">
                              {customer.fullName}
                            </span>
                            {categoryName && (
                              <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded leading-none uppercase">
                                {categoryName}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                            {customer.location && (
                              <span className="flex items-center gap-1">
                                <span className="opacity-70 italic text-[11px]">at</span> {customer.location}
                              </span>
                            )}
                            {customer.phoneNumber && (
                              <span className="flex items-center gap-1">
                                <span className="opacity-70 tabular-nums">{customer.phoneNumber}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-center text-muted-foreground">
                  <p className="text-sm">No customers found</p>
                  <p className="text-xs opacity-70 mt-1">Try a different search or add a new customer</p>
                </div>
              )}
            </div>
          )}

          {errors.customerName && (
            <p className="text-red-500 text-xs">{errors.customerName}</p>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        <Label htmlFor="customerAddress">Customer Address</Label>
        <Input
          id="customerAddress"
          name="customerAddress"
          value={customerAddress}
          onChange={onCustomerInfoChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              document.getElementById('customerContact')?.focus();
            }
          }}
        />
      </div>

      <div className="grid gap-3">
        <Label htmlFor="customerContact">Customer Contact</Label>
        <Input
          id="customerContact"
          name="customerContact"
          value={customerContact}
          onChange={onCustomerInfoChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const categoryInput = document.getElementById('customerCategory');
              const categorySelect = document.querySelector('[role="combobox"]') as HTMLElement;
              if (categoryInput) {
                categoryInput.focus();
              } else if (categorySelect) {
                categorySelect.focus();
              } else {
                document.getElementById('description-0')?.focus();
              }
            }
          }}
        />
      </div>

      <div className="grid gap-3">
        <Label htmlFor="customerCategory">Customer Category</Label>
        {isExistingCustomer ? (
          <Input
            id="customerCategory"
            value={selectedCustomerCategory}
            readOnly
            className="bg-gray-50 dark:bg-gray-800"
            placeholder="Category from existing customer"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('description-0')?.focus();
              }
            }}
          />
        ) : (
          <Select
            value={selectedCategoryId || "none"}
            onValueChange={handleCategorySelect}
            onOpenChange={(open) => {
              if (!open) {
                // When select closes, focus next field after a brief delay
                setTimeout(() => {
                  document.getElementById('description-0')?.focus();
                }, 100);
              }
            }}
          >
            <SelectTrigger
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Let the select handle the Enter key, then focus next field
                  setTimeout(() => {
                    document.getElementById('description-0')?.focus();
                  }, 100);
                }
              }}
            >
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Category</SelectItem>
              {categories
                .filter(category => category.id && category.id.trim() !== "")
                .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        )}
      </div>


      {onAddNewCustomer && (
        <Button
          type="button"
          variant="outline"
          onClick={onAddNewCustomer}
          className="w-full mt-2"
        >
          Add New Customer
        </Button>
      )}
    </div>
  );
};

export default CustomerInformation;
