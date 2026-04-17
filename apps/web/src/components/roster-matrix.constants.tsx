import { Coffee, Moon, Sun, Sunset } from "lucide-react";
import type { ShiftType } from "./roster-matrix.types";

export const NURSES = [
	"Emma Wilson",
	"Liam Johnson",
	"Olivia Brown",
	"Noah Davis",
	"Ava Miller",
	"Oliver Garcia",
	"Elijah Martinez",
	"Sophia Anderson",
	"Lucas Thomas",
	"Isabella Jackson",
	"Mason White",
	"Mia Harris",
	"Ethan Martin",
	"Charlotte Thompson",
	"Alexander Moore",
	"Amelia Taylor",
	"James Clark",
	"Harper Lewis",
	"Benjamin Walker",
	"Evelyn Hall",
	"Henry Young",
	"Abigail King",
	"Sebastian Wright",
	"Emily Scott",
	"Jack Green",
	"Elizabeth Baker",
	"Daniel Adams",
	"Sofia Nelson",
	"Matthew Hill",
	"Avery Campbell",
];

export const SHIFT_STYLES: Record<ShiftType, string> = {
	morning:
		"bg-gradient-to-br from-[#FDE68A] to-[#FCD34D] text-amber-900 border-amber-300 shadow-sm shadow-amber-200/50",
	evening:
		"bg-gradient-to-br from-[#BFDBFE] to-[#93C5FD] text-blue-900 border-blue-200 shadow-sm shadow-blue-200/50",
	night:
		"bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] text-violet-900 border-violet-300 shadow-sm shadow-violet-300/50",
	off: "bg-slate-50 text-slate-400 border-slate-100 ring-1 ring-slate-100/50",
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
		time: "8AM - 4PM",
	},
	{
		value: "evening",
		label: SHIFT_LABELS.evening,
		icon: <Sunset className="h-7 w-7" />,
		time: "4PM - 12AM",
	},
	{
		value: "night",
		label: SHIFT_LABELS.night,
		icon: <Moon className="h-7 w-7" />,
		time: "12AM - 8AM",
	},
	{
		value: "off",
		label: SHIFT_LABELS.off,
		icon: <Coffee className="h-7 w-7" />,
		time: SHIFT_TIMES.off,
	},
];
