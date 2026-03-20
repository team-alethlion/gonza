
import React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SaleDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const SaleDatePicker: React.FC<SaleDatePickerProps> = ({
  selectedDate,
  onDateChange,
}) => {
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Ensure the date is set to noon to avoid timezone issues
      const adjustedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
      onDateChange(adjustedDate);
    }
  };

  return (
    <div className="grid gap-3">
      <Label htmlFor="date">Date</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SaleDatePicker;
