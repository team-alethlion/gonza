"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCategories } from "@/hooks/useCategories";
import CategoryManager from "@/components/inventory/CategoryManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const Categories = () => {
  const router = useRouter();
  const { user } = useAuth();
  const {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories(user?.id);
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  // Form states
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoBack = () => {
    if (returnTo) {
      router.push(returnTo);
    } else {
      router.push("/products");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createCategory(newCategoryName.trim());
      if (result) {
        toast.success("Category created successfully");
        setNewCategoryName("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editCategoryId || !editCategoryName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateCategory(
        editCategoryId,
        editCategoryName.trim(),
      );
      if (result) {
        toast.success("Category updated successfully");
        setEditCategoryId(null);
        setEditCategoryName("");
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
        toast.success("Category deleted successfully");
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoBack}
              className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              {returnTo ? "Back to Product Form" : "Back to Products"}
            </Button>
          </div>
          <h1 className="text-2xl font-bold md:text-3xl text-sales-dark">
            Categories
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your product categories
          </p>
        </div>
      </div>

      {/* Add New Category Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Add New Category
            <Dialog>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Category</DialogTitle>
                  <DialogDescription>
                    Enter a name for your new product category.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                  <Input
                    placeholder="Enter category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim() || isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Category"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Create categories to organize your products better. Click &quot;Add
            Category&quot; to get started.
          </p>
        </CardContent>
      </Card>

      {/* Existing Categories with Actions */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Existing Categories ({categories.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <h3 className="font-medium">{category.name}</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(category.id, category.name)}
                      className="flex items-center gap-1">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Category</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;
                            {category.name}&quot;? This action cannot be undone.
                            Products using this category will need to be
                            reassigned.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCategory(category.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Category
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Category Dialog */}
      {editCategoryId !== null && (
        <Dialog
          open={editCategoryId !== null}
          onOpenChange={(open) => !open && setEditCategoryId(null)}>
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
              <Button variant="outline" onClick={() => setEditCategoryId(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateCategory}
                disabled={!editCategoryName.trim() || isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Empty State */}
      {categories.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              No categories created yet. Create your first category to get
              started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Categories;
