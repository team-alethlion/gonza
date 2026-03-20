
import React from "react";
import { getTodaysTip } from "@/utils/businessGoalTips";
import { Lightbulb } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const BusinessGoalsTip = () => {
  const todaysTip = getTodaysTip();

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-gray-600">
          <span className="font-medium text-amber-600">Business Goals Tip:</span>{" "}
          <span>{todaysTip}</span>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-1 cursor-help text-gray-400 hover:text-gray-600 text-xs">
                  (New tip daily)
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">Tips refresh each day to help you stay motivated and reach your sales goals.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export default BusinessGoalsTip;
