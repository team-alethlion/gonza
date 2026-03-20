"use client";
import React, { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Plus, Tag } from 'lucide-react';
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
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ProductCategory } from '@/types';

interface CategoryManagerProps {
  onCategoryCreated?: (category: ProductCategory) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ onCategoryCreated }) => {
  const { user } = useAuth();
  const { categories, createCategory, updateCategory, deleteCategory } = useCategories(user?.id);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('add');

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await createCategory(newCategoryName.trim());
      if (result) {
        toast.success('Category created successfully');
        setNewCategoryName('');
        
        // Call the callback if provided
        if (onCategoryCreated && result) {
          onCategoryCreated(result);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editCategoryId || !editCategoryName.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await updateCategory(editCategoryId, editCategoryName.trim());
      if (result) {
        toast.success('Category updated successfully');
        setEditCategoryId(null);
        setEditCategoryName('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setIsSubmitting(true);
    try {
      const result = await deleteCategory(id);
      if (result) {
        toast.success('Category deleted successfully');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (id: string, name: string) => {
    setEditCategoryId(id);
    setEditCategoryName(name);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
          <DialogDescription>
            Manage your product categories
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add">Add Category</TabsTrigger>
            <TabsTrigger value="manage">
              View Categories 
              {categories.length > 0 && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {categories.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Add Category Tab */}
          <TabsContent value="add" className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-grow"
              />
              <Button 
                onClick={handleCreateCategory} 
                disabled={!newCategoryName.trim() || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </TabsContent>
          
          {/* View/Manage Categories Tab */}
          <TabsContent value="manage" className="py-4">
            {categories.length > 0 ? (
              <ScrollArea className="h-52 rounded-md border p-2">
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-gray-500" />
                        <span>{category.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => startEdit(category.id, category.name)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this category? Products using this category will need to be reassigned.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteCategory(category.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No categories yet. Switch to "Add Category" tab to create your first category.
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Edit Category Dialog */}
        {editCategoryId !== null && (
          <Dialog 
            open={editCategoryId !== null} 
            onOpenChange={(open) => !open && setEditCategoryId(null)}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Category</DialogTitle>
                <DialogDescription>
                  Update the name of this category.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <Input
                  placeholder="Enter category name"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setEditCategoryId(null)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateCategory} 
                  disabled={!editCategoryName.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        
        <DialogFooter className="pt-4 sm:justify-end">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryManager;
