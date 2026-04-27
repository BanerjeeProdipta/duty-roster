import { cn } from "@Duty-Roster/ui/lib/utils";
import { Coffee, FileUser, Moon, Sun, Sunset } from "lucide-react";

const shiftIcons = {
  morning: Sun,
  evening: Sunset,
  night: Moon,
  off: Coffee,
  total: FileUser,
};

const iconColors = {
  under: "text-green-500",
  exact: "text-gray-400",
  over: "text-red-500",
};

const textColors = {
  under: "text-green-700",
  exact: "text-slate-700",
  over: "text-red-600",
};

export function AllocationItem({
  current,
  target,
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
  const status = needed < 0 ? "under" : needed === 0 ? "exact" : "over";

  const containerClass =
    "flex items-center gap-1 whitespace-nowrap rounded p-0.5 transition-colors";

  const iconColor = iconColors[status];
  const textClass = cn("font-medium text-xs", textColors[status]);

  const tooltip = `${label} Shift: ${current} assigned / ${target} target${
    min !== undefined ? ` (min ${min})` : ""
  }`;

  return (
    <div className={containerClass} title={tooltip}>
      <span className="sr-only">{tooltip}</span>

      <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
      <span className={textClass} suppressHydrationWarning>
        {Math.abs(needed)}
      </span>
    </div>
  );
}
