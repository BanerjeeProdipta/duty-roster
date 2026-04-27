import { cn } from "@Duty-Roster/ui/lib/utils";
import { SHIFT_BADGE_STYLES } from "./RosterMatrix.constants";

export interface ShiftBadgeProps {
  count: number;
  min?: number;
  max?: number;
  shiftType: "morning" | "evening" | "night";
}

export function ShiftBadge({ count, min, max, shiftType }: ShiftBadgeProps) {
  const isUnder = min !== undefined && count < min;
  const isOver = max !== undefined && count > max;
  const isError = isUnder || isOver;

  const display = min ?? max ?? 0;

  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-[10px] opacity-70",
        SHIFT_BADGE_STYLES[shiftType],
      )}
      title={`${shiftType.charAt(0).toUpperCase() + shiftType.slice(1)}: ${count} (min: ${min ?? "-"}, max: ${max ?? "-"})`}
    >
      {isError && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
        </span>
      )}
      <span suppressHydrationWarning>
        {count}/{display}
      </span>
    </span>
  );
}
