
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface RecurrenceSettingsProps {
  isRecurring: boolean;
  recurrenceType: 'daily' | 'weekly' | 'monthly' | '';
  recurrenceEndDate: Date | null;
  dueDate: Date;
  onRecurringChange: (enabled: boolean) => void;
  onRecurrenceTypeChange: (type: 'daily' | 'weekly' | 'monthly' | '') => void;
  onRecurrenceEndDateChange: (date: Date | null) => void;
}

const RecurrenceSettings: React.FC<RecurrenceSettingsProps> = ({
  isRecurring,
  recurrenceType,
  recurrenceEndDate,
  dueDate,
  onRecurringChange,
  onRecurrenceTypeChange,
  onRecurrenceEndDateChange,
}) => {
  const maxEndDate = addMonths(dueDate, 12);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Switch
          id="recurring"
          checked={isRecurring}
          onCheckedChange={onRecurringChange}
        />
        <Label htmlFor="recurring">Make this a recurring task</Label>
      </div>

      {isRecurring && (
        <div className="space-y-4 pl-6 border-l-2 border-gray-100">
          <div className="space-y-2">
            <Label>Repeat frequency</Label>
            <Select
              value={recurrenceType}
              onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                onRecurrenceTypeChange(value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurrenceType && (
            <div className="space-y-2">
              <Label>End date (max 12 months)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !recurrenceEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {recurrenceEndDate ? format(recurrenceEndDate, 'MMM dd, yyyy') : 'Select end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={recurrenceEndDate || undefined}
                    onSelect={(date) => onRecurrenceEndDateChange(date || null)}
                    fromDate={dueDate}
                    toDate={maxEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-gray-500">
                Recurring tasks can repeat for up to 12 months from the due date
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecurrenceSettings;
