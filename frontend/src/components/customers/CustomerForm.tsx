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
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { DialogFooter } from "@/components/ui/dialog";
import { useCustomerCategories } from "@/hooks/useCustomerCategories";
import { useCustomerDraft } from "@/hooks/useCustomerDraft";
import { toast } from "sonner";

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
  
  // Initialize date state with proper timezone handling 
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (initialData?.birthday) return initialData.birthday;
    return undefined;
  });
  
  // Initialize category selection
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>(
    initialData?.categoryId || "none"
  );
  
  const [socialMedia, setSocialMedia] = React.useState({
    facebook: initialData?.socialMedia?.facebook || "",
    instagram: initialData?.socialMedia?.instagram || "",
    twitter: initialData?.socialMedia?.twitter || "",
    linkedin: initialData?.socialMedia?.linkedin || "",
    other: initialData?.socialMedia?.other || "",
  });
  
  const [tags, setTags] = React.useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = React.useState("");
  const [selectedGender, setSelectedGender] = React.useState(initialData?.gender || "");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      fullName: initialData?.fullName || "",
      email: initialData?.email || "",
      phoneNumber: initialData?.phoneNumber || "",
      location: initialData?.location || "",
      notes: initialData?.notes || "",
    },
  });

  const formValues = watch();

  // Load draft on mount for new customer
  React.useEffect(() => {
    if (!initialData && hasDraft) {
      const draft = loadDraft();
      if (draft) {
        const { formData } = draft;
        if (formData.fullName) setValue("fullName", formData.fullName);
        if (formData.email) setValue("email", formData.email);
        if (formData.phoneNumber) setValue("phoneNumber", formData.phoneNumber);
        if (formData.location) setValue("location", formData.location);
        if (formData.notes) setValue("notes", formData.notes);
        if (formData.birthday) setDate(new Date(formData.birthday));
        if (formData.categoryId) setSelectedCategoryId(formData.categoryId);
        if (formData.gender) setSelectedGender(formData.gender);
        if (formData.socialMedia) setSocialMedia(formData.socialMedia);
        if (formData.tags) setTags(formData.tags);
        
        toast.info("Restored your unsaved customer details");
      }
    }
  }, [initialData]);

  // Auto-save logic
  React.useEffect(() => {
    if (initialData || isSubmitting) return;

    const dataToSave = {
      ...formValues,
      birthday: date?.toISOString(),
      categoryId: selectedCategoryId,
      gender: selectedGender,
      socialMedia,
      tags
    };

    const hasData = formValues.fullName?.trim() || formValues.email?.trim() || formValues.phoneNumber?.trim();

    if (hasData) {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      saveDraft(dataToSave, false); // Instant session save
      autoSaveTimeoutRef.current = setTimeout(() => saveDraft(dataToSave, true), 2000); // Debounced local save
    }

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [formValues, date, selectedCategoryId, selectedGender, socialMedia, tags, initialData, isSubmitting, saveDraft]);

  const addTag = () => {
    if (tagInput.trim() !== "" && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSocialMediaChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    platform: string
  ) => {
    setSocialMedia({
      ...socialMedia,
      [platform]: e.target.value,
    });
  };

  const onFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const customerData: Partial<Customer> = {
        ...data,
        gender: selectedGender,
        birthday: date,
        categoryId: selectedCategoryId === "none" ? null : selectedCategoryId,
        socialMedia: Object.keys(socialMedia).length > 0 ? socialMedia : null,
        tags: tags.length > 0 ? tags : null,
      };
      
      const success = await onSubmit(customerData);
      if (success && !initialData) {
        clearDraft();
      }
      return success;
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = [
    { value: 0, label: "January" }, { value: 1, label: "February" }, { value: 2, label: "March" },
    { value: 3, label: "April" }, { value: 4, label: "May" }, { value: 5, label: "June" },
    { value: 6, label: "July" }, { value: 7, label: "August" }, { value: 8, label: "September" },
    { value: 9, label: "October" }, { value: 10, label: "November" }, { value: 11, label: "December" },
  ];

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();
      setDate(new Date(Date.UTC(year, month, day, 12, 0, 0)));
    } else {
      setDate(undefined);
    }
  };

  const handleYearSelect = (year: string) => {
    const yearNum = parseInt(year);
    const newDate = date ? new Date(date) : new Date();
    setDate(new Date(Date.UTC(yearNum, newDate.getMonth(), newDate.getDate(), 12, 0, 0)));
  };

  const handleMonthSelect = (month: string) => {
    const monthNum = parseInt(month);
    const newDate = date ? new Date(date) : new Date();
    setDate(new Date(Date.UTC(newDate.getFullYear(), monthNum, newDate.getDate(), 12, 0, 0)));
  };

  const validCategories = categories.filter(category => category.id && category.id.trim() !== '');

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name*</Label>
            <Input
              id="fullName"
              {...register("fullName", { required: "Name is required" })}
              className={cn(errors.fullName && "border-red-500")}
            />
            {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Category</SelectItem>
                {validCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              {...register("email", {
                pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email address" },
              })}
              className={cn(errors.email && "border-red-500")}
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input id="phoneNumber" {...register("phoneNumber")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register("location")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={selectedGender} onValueChange={setSelectedGender}>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Birthday</Label>
            <div className="flex flex-col gap-2">
              <div className="flex flex-row gap-2">
                <div className="flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {date ? date.getDate() : "Day"}
                        <CalendarIcon className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                        captionLayout="buttons"
                        className="p-3 pointer-events-auto"
                        classNames={{ caption_label: "hidden", dropdown: "hidden" }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1">
                  <Select value={date ? String(date.getMonth()) : undefined} onValueChange={handleMonthSelect}>
                    <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select value={date ? String(date.getFullYear()) : undefined} onValueChange={handleYearSelect}>
                    <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {date && <div className="text-sm text-muted-foreground">Selected: {format(date, "PPP")}</div>}
            </div>
          </div>
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
            <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} />
            <Button type="button" onClick={addTag} variant="outline">Add</Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Social Media</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {['facebook', 'instagram', 'twitter', 'linkedin'].map((platform) => (
              <div key={platform} className="space-y-1">
                <Label htmlFor={platform} className="text-xs capitalize">{platform}</Label>
                <Input
                  id={platform}
                  value={(socialMedia as any)[platform]}
                  onChange={(e) => handleSocialMediaChange(e, platform)}
                  placeholder={platform === 'linkedin' ? "Profile URL" : "Username"}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" {...register("notes")} rows={4} placeholder="Add any notes about this customer..." />
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
        </DialogFooter>
      </div>
    </form>
  );
};

export default CustomerForm;
