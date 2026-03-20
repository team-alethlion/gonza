/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CashAccountFormData } from "@/types/cash";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface CashAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CashAccountFormData) => void;
  title: string;
  initialData?: Partial<CashAccountFormData>;
  isSubmitting?: boolean;
}

const CashAccountDialog: React.FC<CashAccountDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  title,
  initialData,
  isSubmitting = false,
}) => {
  const { settings } = useBusinessSettings();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CashAccountFormData>({
    defaultValues: {
      name: "",
      description: "",
      isDefault: false,
      ...initialData,
    },
  });

  React.useEffect(() => {
    if (open && initialData) {
      reset({
        name: initialData.name || "",
        description: initialData.description || "",
        openingBalance: initialData.openingBalance || 0,
        isDefault: initialData.isDefault || false,
      });
    } else if (open) {
      reset({
        name: "",
        description: "",
        openingBalance: undefined as any,
        isDefault: false,
      });
    }
  }, [open, initialData, reset]);

  const isDefault = watch("isDefault");

  const handleFormSubmit = (data: CashAccountFormData) => {
    onSubmit(data);
  };

  // Use business settings currency, default to UGX if not set
  const currency = settings.currency || "UGX";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              {...register("name", { required: "Account name is required" })}
              placeholder="e.g., Main Cash, Petty Cash"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Brief description of this account"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="openingBalance">Opening Balance ({currency})</Label>
            <Input
              id="openingBalance"
              type="number"
              step="0.01"
              {...register("openingBalance", {
                required: "Opening balance is required",
                min: {
                  value: 0,
                  message: "Opening balance cannot be negative",
                },
              })}
              placeholder="0.00"
              disabled={isSubmitting}
            />
            {errors.openingBalance && (
              <p className="text-sm text-red-600">
                {errors.openingBalance.message}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDefault"
              checked={isDefault}
              onCheckedChange={(checked) =>
                setValue("isDefault", checked as boolean)
              }
              disabled={isSubmitting}
            />
            <Label htmlFor="isDefault" className="text-sm">
              Set as default account
            </Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? initialData
                  ? "Updating..."
                  : "Creating..."
                : initialData
                ? "Update Account"
                : "Create Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CashAccountDialog;
