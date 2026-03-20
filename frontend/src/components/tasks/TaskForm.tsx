"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Task, CreateTaskData, TaskPriority } from '@/types/task';
import { useTaskCategories } from '@/hooks/useTaskCategories';
import RecurrenceSettings from './RecurrenceSettings';
import { cn } from '@/lib/utils';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskData) => Promise<void>;
  task?: Task | null;
  initialDate?: Date;
}

import { useTaskDraft } from '@/hooks/useTaskDraft';
import { toast } from 'sonner';

const TaskForm: React.FC<TaskFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  initialDate,
}) => {
  const { hasDraft, saveDraft, loadDraft, clearDraft } = useTaskDraft();
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { categories } = useTaskCategories();

  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    priority: 'Medium',
    due_date: format(initialDate || new Date(), 'yyyy-MM-dd'),
    category: '',
    reminder_enabled: false,
    reminder_time: '',
    is_recurring: false,
    recurrence_type: undefined,
    recurrence_end_date: undefined,
  });

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);

  // Load draft on mount for NEW task
  useEffect(() => {
    if (isOpen && !task && hasDraft) {
      const draft = loadDraft();
      if (draft) {
        const timer = setTimeout(() => {
          setFormData(draft.formData);
          if (draft.formData.due_date) {
            setSelectedDate(new Date(draft.formData.due_date));
          }
        }, 0);
        toast.info("Restored your unsaved task details");
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, task, hasDraft, loadDraft]);

  // Auto-save logic
  useEffect(() => {
    if (!isOpen || task || isSubmitting) return;

    const hasData = formData.title.trim() || formData.description?.trim();

    if (hasData) {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      saveDraft(formData, false); // Instant session save
      autoSaveTimeoutRef.current = setTimeout(() => saveDraft(formData, true), 2000); // Local save
    }

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [formData, isOpen, task, isSubmitting, saveDraft]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        due_date: task.due_date,
        category: task.category || '',
        reminder_enabled: task.reminder_enabled,
        reminder_time: task.reminder_time || '',
        is_recurring: task.is_recurring,
        recurrence_type: task.recurrence_type || undefined,
        recurrence_end_date: task.recurrence_end_date || undefined,
      });
      setSelectedDate(new Date(task.due_date));
      setRecurrenceEndDate(task.recurrence_end_date ? new Date(task.recurrence_end_date) : null);
    } else if (initialDate) {
      setFormData(prev => ({
        ...prev,
        due_date: format(initialDate, 'yyyy-MM-dd'),
      }));
      setSelectedDate(initialDate);
    }
  }, [task, initialDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert "no-category" back to empty string for the database
      const submitData = {
        ...formData,
        category: formData.category === 'no-category' ? '' : formData.category,
        recurrence_end_date: recurrenceEndDate ? format(recurrenceEndDate, 'yyyy-MM-dd') : undefined,
      };
      await onSubmit(submitData);
      
      // Clear draft after successful submission
      if (!task) {
        clearDraft();
        // Reset form for new task
        setFormData({
          title: '',
          description: '',
          priority: 'Medium',
          due_date: format(new Date(), 'yyyy-MM-dd'),
          category: '',
          reminder_enabled: false,
          reminder_time: '',
          is_recurring: false,
          recurrence_type: undefined,
          recurrence_end_date: undefined,
        });
        setSelectedDate(new Date());
        setRecurrenceEndDate(null);
      }
      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    console.log('TaskForm handleDateSelect called with:', date);
    if (date) {
      setSelectedDate(date);
      setFormData(prev => ({
        ...prev,
        due_date: format(date, 'yyyy-MM-dd'),
      }));
    }
  };

  const priorityColors = {
    Low: 'text-green-600',
    Medium: 'text-yellow-600',
    High: 'text-red-600',
  };

  console.log('TaskForm about to render dialog, isOpen:', isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="What needs to be done?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add more details..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: TaskPriority) => 
                  setFormData(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low" className={priorityColors.Low}>Low Priority</SelectItem>
                  <SelectItem value="Medium" className={priorityColors.Medium}>Medium Priority</SelectItem>
                  <SelectItem value="High" className={priorityColors.High}>High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category || 'no-category'}
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, category: value === 'no-category' ? '' : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-category">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <RecurrenceSettings
            isRecurring={formData.is_recurring || false}
            recurrenceType={formData.recurrence_type || ''}
            recurrenceEndDate={recurrenceEndDate}
            dueDate={selectedDate}
            onRecurringChange={(enabled) => 
              setFormData(prev => ({ 
                ...prev, 
                is_recurring: enabled,
                recurrence_type: enabled ? prev.recurrence_type : undefined,
              }))
            }
            onRecurrenceTypeChange={(type) => 
              setFormData(prev => ({ ...prev, recurrence_type: type || undefined }))
            }
            onRecurrenceEndDateChange={setRecurrenceEndDate}
          />

          <div className="flex items-center space-x-2">
            <Switch
              id="reminder"
              checked={formData.reminder_enabled}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, reminder_enabled: checked }))
              }
            />
            <Label htmlFor="reminder">Enable reminder</Label>
          </div>

          {formData.reminder_enabled && (
            <div className="space-y-2">
              <Label htmlFor="reminder-time">Reminder Time</Label>
              <Input
                id="reminder-time"
                type="time"
                value={formData.reminder_time}
                onChange={(e) => setFormData(prev => ({ ...prev, reminder_time: e.target.value }))}
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.title.trim()}>
              {isSubmitting ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskForm;
