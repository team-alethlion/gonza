"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Settings } from 'lucide-react';
import { useSalesCategories } from '@/hooks/useSalesCategories';
import { SalesCategory } from '@/types';
const SalesCategoryManager = () => {
  const {
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
    createDefaultCategories
  } = useSalesCategories();
  const [isOpen, setIsOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<SalesCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<SalesCategory | null>(null);
  const handleCreate = async () => {
    if (!newCategoryName.trim()) return;
    const success = await createCategory(newCategoryName.trim());
    if (success) {
      setNewCategoryName('');
    }
  };
  const handleEdit = async () => {
    if (!editingCategory || !editName.trim()) return;
    const success = await updateCategory(editingCategory.id, editName.trim());
    if (success) {
      setEditingCategory(null);
      setEditName('');
    }
  };
  const handleDelete = async () => {
    if (!categoryToDelete) return;
    const success = await deleteCategory(categoryToDelete.id);
    if (success) {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };
  const startEdit = (category: SalesCategory) => {
    setEditingCategory(category);
    setEditName(category.name);
  };
  const startDelete = (category: SalesCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };
  const handleCreateDefaults = async () => {
    await createDefaultCategories();
  };
  return <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Sales Categories</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Create new category */}
            <div className="space-y-2">
              <Label htmlFor="new-category">Add New Category</Label>
              <div className="flex gap-2">
                <Input id="new-category" placeholder="Category name" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleCreate()} />
                <Button onClick={handleCreate} disabled={!newCategoryName.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {/* Categories list */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Existing Categories</Label>
                {categories.length === 0 && <Button variant="outline" size="sm" onClick={handleCreateDefaults}>
                    Create Default Categories
                  </Button>}
              </div>
              
              {categories.length > 0 ? <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categories.map(category => <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                      {editingCategory?.id === category.id ? <div className="flex gap-2 flex-1">
                          <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleEdit()} className="flex-1" />
                          <Button size="sm" onClick={handleEdit}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                            Cancel
                          </Button>
                        </div> : <>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{category.name}</span>
                            {category.is_default && <span className="text-xs bg-muted px-2 py-1 rounded">Default</span>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => startEdit(category)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => startDelete(category)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>}
                    </div>)}
                </div> : <p className="text-muted-foreground text-sm">No categories found. Create your first category above.</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
};
export default SalesCategoryManager;