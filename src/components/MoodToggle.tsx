
import React from "react";
import { Switch } from "@/components/ui/switch";
import { ZapIcon } from "lucide-react";

interface MoodToggleProps {
  isAdvanced: boolean;
  onToggle: () => void;
}

const MoodToggle = ({ isAdvanced, onToggle }: MoodToggleProps) => {
  return (
    <div className={`flex items-center gap-2 py-2 px-4 rounded-full transition-all duration-300 ${isAdvanced ? "bg-primary/80" : "bg-secondary"}`}>
      <ZapIcon 
        size={18} 
        className={`transition-all duration-300 ${isAdvanced ? "text-white" : "text-gray-600"}`}
      />
      <span className={`text-sm font-medium transition-all duration-300 ${isAdvanced ? "text-white" : "text-gray-600"}`}>
        Advanced Mode
      </span>
      <Switch 
        checked={isAdvanced}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-white"
      />
    </div>
  );
};

export default MoodToggle;



