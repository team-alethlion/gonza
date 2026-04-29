"use client";

import React from "react";
import { Customer } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, X, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DialogFooter } from "@/components/ui/dialog";
import { useCustomerCategories } from "@/hooks/useCustomerCategories";
import { useCustomerDraft } from "@/hooks/useCustomerDraft";
import { toast } from "sonner";
import { customerSchema, type CustomerFormValues } from "@/lib/validations/customer";

interface CustomerFormProps {
  initialData?: Customer;
  onSubmit: (data: Partial<Customer>) => Promise<boolean>;
  onCancel: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { categories } = useCustomerCategories();
  const { hasDraft, saveDraft, loadDraft, clearDraft } = useCustomerDraft();
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout>();

  const [tags, setTags] = React.useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = React.useState("");
  const [socialMedia, setSocialMedia] = React.useState({
    facebook: initialData?.socialMedia?.facebook || "",
    instagram: initialData?.socialMedia?.instagram || "",
    twitter: initialData?.socialMedia?.twitter || "",
    linkedin: initialData?.socialMedia?.linkedin || "",
    other: initialData?.socialMedia?.other || "",
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      fullName: initialData?.fullName || "",
      email: initialData?.email || "",
      phoneNumber: initialData?.phoneNumber || "",
      location: initialData?.location || "",
      notes: initialData?.notes || "",
      creditLimit: initialData?.creditLimit || 0,
      gender: initialData?.gender || "",
      categoryId: initialData?.categoryId || "none",
      birthday: initialData?.birthday ? new Date(initialData.birthday) : null,
      tags: initialData?.tags || [],
    },
  });

  const { watch, setValue, control, handleSubmit } = form;
  const formValues = watch();

  // Load draft on mount for new customer
  React.useEffect(() => {
    if (!initialData && hasDraft) {
      const draft = loadDraft();
      if (draft) {
        const { formData } = draft;
        Object.keys(formData).forEach((key) => {
          if (key === "birthday" && formData[key]) {
            setValue(key as any, new Date(formData[key]));
          } else if (key === "socialMedia") {
            setSocialMedia(formData[key]);
          } else if (key === "tags") {
            setTags(formData[key]);
          } else {
            setValue(key as any, formData[key]);
          }
        });
        toast.info("Restored your unsaved customer details");
      }
    }
  }, [initialData, hasDraft, loadDraft, setValue]);

  // Auto-save logic
  React.useEffect(() => {
    if (initialData || isSubmitting) return;

    const dataToSave = {
      ...formValues,
      socialMedia,
      tags
    };

    const hasData = formValues.fullName?.trim() || formValues.email?.trim() || formValues.phoneNumber?.trim();

    if (hasData) {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      saveDraft(dataToSave, false); 
      autoSaveTimeoutRef.current = setTimeout(() => saveDraft(dataToSave, true), 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [formValues, socialMedia, tags, initialData, isSubmitting, saveDraft]);

  const addTag = () => {
    if (tagInput.trim() !== "" && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setValue("tags", newTags);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    setValue("tags", newTags);
  };

  const onFormSubmit = async (values: CustomerFormValues) => {
    setIsSubmitting(true);
    try {
      const customerData: Partial<Customer> = {
        ...values,
        categoryId: values.categoryId === "none" ? null : values.categoryId,
        socialMedia: Object.values(socialMedia).some(v => v) ? socialMedia : null,
        tags: tags.length > 0 ? tags : null,
      };
      
      const success = await onSubmit(customerData);
      if (success && !initialData) {
        clearDraft();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCategories = categories.filter(category => category.id && category.id.trim() !== '');
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = [
    { value: 0, label: "January" }, { value: 1, label: "February" }, { value: 2, label: "March" },
    { value: 3, label: "April" }, { value: 4, label: "May" }, { value: 5, label: "June" },
    { value: 6, label: "July" }, { value: 7, label: "August" }, { value: 8, label: "September" },
    { value: 9, label: "October" }, { value: 10, label: "November" }, { value: 11, label: "December" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name*</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Customer's full name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {validCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="customer@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. +256..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="City, Area" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="creditLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credit Limit</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="1" placeholder="0" />
                </FormControl>
                <FormDescription>Maximum debt allowed.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="birthday"
            render={({ field }) => (
              <FormItem className="flex flex-col justify-end">
                <FormLabel className="mb-2">Birthday</FormLabel>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-between px-3">
                        {field.value ? field.value.getDate() : "Day"}
                        <CalendarIcon className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={(date) => {
                          if (date) {
                            const newDate = field.value ? new Date(field.value) : new Date();
                            newDate.setFullYear(newDate.getFullYear());
                            newDate.setMonth(newDate.getMonth());
                            newDate.setDate(date.getDate());
                            field.onChange(newDate);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Select 
                    value={field.value ? String(field.value.getMonth()) : undefined} 
                    onValueChange={(month) => {
                      const newDate = field.value ? new Date(field.value) : new Date();
                      newDate.setMonth(parseInt(month));
                      field.onChange(newDate);
                    }}
                  >
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={field.value ? String(field.value.getFullYear()) : undefined} 
                    onValueChange={(year) => {
                      const newDate = field.value ? new Date(field.value) : new Date();
                      newDate.setFullYear(parseInt(year));
                      field.onChange(newDate);
                    }}
                  >
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {field.value && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Formatted: {format(field.value, "PPP")}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
                <button type="button" className="ml-1 rounded-full hover:bg-gray-200" onClick={() => removeTag(tag)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input 
              value={tagInput} 
              onChange={(e) => setTagInput(e.target.value)} 
              placeholder="Add tag" 
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }} 
            />
            <Button type="button" onClick={addTag} variant="outline" size="sm">Add</Button>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Social Media</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {['facebook', 'instagram', 'twitter', 'linkedin'].map((platform) => (
              <div key={platform} className="space-y-1">
                <Label htmlFor={platform} className="text-[10px] uppercase text-muted-foreground">{platform}</Label>
                <Input
                  id={platform}
                  value={(socialMedia as any)[platform]}
                  onChange={(e) => setSocialMedia({ ...socialMedia, [platform]: e.target.value })}
                  placeholder={platform === 'linkedin' ? "Profile URL" : "Username"}
                />
              </div>
            ))}
          </div>
        </div>

        <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} placeholder="Add any notes about this customer..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default CustomerForm;
