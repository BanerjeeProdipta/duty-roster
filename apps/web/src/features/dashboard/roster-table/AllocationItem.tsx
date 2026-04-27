import { cn } from "@Duty-Roster/ui/lib/utils";
import { Coffee, FileUser, Moon, Sun, Sunset } from "lucide-react";

const shiftIcons = {
  morning: Sun,
  evening: Sunset,
  night: Moon,
  off: Coffee,
  total: FileUser,
};

export function AllocationItem({
  current,
  target,
  color,
  label,
  min,
  shiftType = "total",
}: {
  current: number;
  target: number;
  color: string;
  label: string;
  min?: number;
  shiftType?: keyof typeof shiftIcons;
}) {
const Icon = shiftIcons[shiftType] ?? FileUser;

	const needed = target - current;
	const isNegative = needed <= 0;
	const isOver = current > target;
	const isCorrect = needed === 0;

	const containerClass = cn(
		"flex items-center gap-1 whitespace-nowrap rounded p-0.5 transition-colors",
		isNegative
			? "bg-red-50"
			: isCorrect
				? "bg-green-50"
				: "bg-slate-50",
	);

	const textClass = cn(
		"font-medium text-xs",
		isNegative
			? "text-red-700"
			: isCorrect
				? "text-green-700"
				: "text-slate-600",
	);

	const tooltip = `${label} Shift: ${current} assigned / ${target} target${
		min !== undefined ? ` (min ${min})` : ""
	}`;

return (
		<div className={containerClass} title={tooltip}>
			<span className="sr-only">{tooltip}</span>

			<Icon className={cn("h-3 w-3 shrink-0", color)} />

			<span className={textClass}>{needed}</span>
		</div>
	);
}
