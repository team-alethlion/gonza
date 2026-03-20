"use client";

import React, { useState } from 'react';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const ExpenseCategoriesManager: React.FC = () => {
  const expenseCategories = useExpenseCategories();
  const { categories, createCategory, deleteCategory } = expenseCategories;
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const result = await createCategory(newCategoryName.trim());
      if (result) {
        setNewCategoryName('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setIsSubmitting(true);
    try {
      await deleteCategory(id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Tag className="h-4 w-4" />
          Expense Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Expense Categories</DialogTitle>
          <DialogDescription>
            Manage your expense categories.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Add new category */}
          <div className="space-y-2">
            <Label htmlFor="newCategory">Add New Category</Label>
            <div className="flex gap-2">
              <Input
                id="newCategory"
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
              <Button 
                onClick={handleCreateCategory} 
                disabled={!newCategoryName.trim() || isSubmitting}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Categories list */}
          <div className="space-y-3">
            {categories.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Categories</h4>
                <ScrollArea className="h-64 rounded-md border p-2">
                  <div className="space-y-1">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <Tag className="h-3 w-3 text-gray-500" />
                          <span className="text-sm">{category.name}</span>
                          {category.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{category.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteCategory(category.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-gray-500">
                No categories yet. Add one above to get started.
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseCategoriesManager;
