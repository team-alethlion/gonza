"use client";


import React from 'react';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Package, Search, X } from 'lucide-react';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import ProductImage from './ProductImage';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import LoadingScreen from '../LoadingScreen';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProductSuggestionsPanelProps {
  suggestions: Product[];
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  searchTerm: string;
  isLoading?: boolean;
}

const ProductSuggestionsPanel: React.FC<ProductSuggestionsPanelProps> = ({
  suggestions,
  isOpen,
  onClose,
  onSelectProduct,
  searchTerm,
  isLoading = false
}) => {
  const { settings } = useBusinessSettings();
  const isMobile = useIsMobile();

  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;

    // Escape special regex characters in searchTerm
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-medium">
          {part}
        </span>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  const handleProductSelect = (product: Product) => {
    onSelectProduct(product);
    onClose();
  };

  // 🚀 UNIFIED UI: Both Mobile and Desktop now use the Sheet component for consistency.
  // The 'modal={false}' on Desktop allows interacting with the form while suggestions are open.
  // On Mobile, we can keep 'modal={true}' if we want a standard drawer feel, but for now, 
  // we'll maintain the current behavior's flexibility.
  return (
    <Sheet open={isOpen} onOpenChange={onClose} modal={isMobile}>
      <SheetContent
        className={cn(
          "p-0 z-[100] flex flex-col bg-primary border-l-0 sm:border-l border-primary-foreground/20",
          isMobile ? "w-full h-full" : "w-full sm:w-[400px] sm:max-w-[400px]"
        )}
        side={isMobile ? "bottom" : "right"}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="p-4 border-b border-primary-foreground/20 bg-primary flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary-foreground" />
              <SheetTitle className="text-base text-primary-foreground">Product Suggestions</SheetTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription className="text-left text-primary-foreground/80">
            {isLoading
              ? 'Searching for products...'
              : suggestions.length > 0
                ? `Found ${suggestions.length} product${suggestions.length > 1 ? 's' : ''} matching "${searchTerm}"`
                : `No products found matching "${searchTerm}"`
            }
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 bg-primary flex flex-col items-center justify-center">
            <LoadingScreen fullScreen={false} message="Searching products..." />
          </div>
        ) : suggestions.length > 0 ? (
          <ScrollArea className="flex-1 h-0 bg-primary">
            <div className="p-2">
              {suggestions.map((product) => (
                <div
                  key={product.id}
                  className="p-3 hover:bg-primary-foreground/20 cursor-pointer border-b border-primary-foreground/20 last:border-b-0 rounded-md mx-1 my-1 hover:shadow-sm transition-all bg-white"
                  onMouseDown={(e) => {
                    // Prevent focus theft and trigger selection immediately
                    e.preventDefault();
                    handleProductSelect(product);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <ProductImage imageUrl={product.imageUrl} alt={product.name} size="sm" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="font-medium text-sm truncate">
                          {highlightMatch(product.name, searchTerm)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Item #: {highlightMatch(product.itemNumber, searchTerm)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Qty: {product.quantity % 1 === 0 ? product.quantity : product.quantity.toFixed(2)}</span>
                        <span className="font-medium">
                          {settings.currency} {product.sellingPrice.toFixed(2)}
                        </span>
                      </div>

                      {product.description && (
                        <div className="text-xs text-gray-500 truncate">
                          {highlightMatch(product.description, searchTerm)}
                        </div>
                      )}

                      {product.supplier && (
                        <div className="text-xs text-gray-500 mt-1">
                          Supplier: {highlightMatch(product.supplier, searchTerm)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-8 text-center text-primary-foreground flex-1 flex flex-col items-center justify-center bg-primary">
            <Search className="h-12 w-12 mx-auto mb-4 text-primary-foreground/50" />
            <p className="text-sm">No products found</p>
            <p className="text-xs mt-1">Try adjusting your search term</p>
          </div>
        )}

        {suggestions.length >= 50 && (
          <div className="p-3 border-t bg-primary text-center flex-shrink-0">
            <span className="text-xs text-primary-foreground">
              Showing top 50 results. Keep typing to refine...
            </span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ProductSuggestionsPanel;

