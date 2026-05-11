import { Coffee, Moon, Sun, Sunset } from "lucide-react";
import type { ShiftType } from "./RosterMatrix.types";

export const SHIFT_BADGE_STYLES: Record<string, string> = {
  morning: "bg-amber-200 text-amber-900",
  evening: "bg-blue-200 text-blue-900",
  night: "bg-violet-200 text-violet-900",
};

export const SHIFT_STYLES: Record<ShiftType, string> = {
  morning:
    "bg-gradient-to-br from-amber-100 to-amber-300 text-amber-900 border-amber-300 shadow-sm shadow-amber-200/50",
  evening:
    "bg-gradient-to-br from-blue-200 to-blue-300 text-blue-900 border-blue-200 shadow-sm shadow-blue-200/50",
  night:
    "bg-gradient-to-br from-violet-200 to-violet-300 text-violet-900 border-violet-300 shadow-sm shadow-violet-300/50",
  off: "bg-gray-50 text-gray-400 border-gray-100 ring-1 ring-gray-100/50 shadow-sm",
};

export const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: "Morning",
  evening: "Evening",
  night: "Night",
  off: "Day Off",
};

export const SHIFT_TIMES: Record<ShiftType, string> = {
  morning: "8:00 AM - 2:00 PM",
  evening: "2:00 PM - 8:00 PM",
  night: "8:00 PM - 8:00 AM",
  off: "No shift",
};

export const SHIFT_ICONS: Record<ShiftType, React.ReactNode> = {
  morning: <Sun className="h-8 w-8" />,
  evening: <Sunset className="h-8 w-8" />,
  night: <Moon className="h-8 w-8" />,
  off: <Coffee className="h-8 w-8" />,
};

export const SHIFT_OPTIONS: {
  value: ShiftType;
  label: string;
  icon: React.ReactNode;
  time: string;
}[] = [
  {
    value: "morning",
    label: SHIFT_LABELS.morning,
    icon: <Sun className="h-7 w-7" />,
    time: SHIFT_TIMES.morning,
  },
  {
    value: "evening",
    label: SHIFT_LABELS.evening,
    icon: <Sunset className="h-7 w-7" />,
    time: SHIFT_TIMES.evening,
  },
  {
    value: "night",
    label: SHIFT_LABELS.night,
    icon: <Moon className="h-7 w-7" />,
    time: SHIFT_TIMES.night,
  },
  {
    value: "off",
    label: SHIFT_LABELS.off,
    icon: <Coffee className="h-7 w-7" />,
    time: SHIFT_TIMES.off,
  },
];
