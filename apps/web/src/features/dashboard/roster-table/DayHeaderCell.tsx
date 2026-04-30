import { cn } from "@Duty-Roster/ui/lib/utils";
import { LAYOUT } from "./Layout";
import { ShiftBadge } from "./ShiftBadge";

export function DayHeaderCell({
	date,
	counts,
}: {
	date: { label: string; formatted: string; isToday: boolean; date: Date };
	counts: { morning: number; evening: number; night: number } | undefined;
}) {
	const isFriday = date.date.getDay() === 5;

	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center whitespace-nowrap border-r border-b text-center font-semibold text-xs uppercase tracking-wide transition-colors",
				date.isToday ? "bg-slate-50" : "bg-white",
			)}
			style={{
				height: LAYOUT.headerHeight,
				flex: `0 0 ${LAYOUT.cellWidth}px`,
				width: LAYOUT.cellWidth,
				padding: "10px",
			}}
		>
			<span className="mb-0.5 block font-black text-slate-900">
				{date.date.getUTCDate()}
			</span>
			<span className="mb-2 block font-medium font-mono text-slate-600 text-xs">
				{date.label}
			</span>

			<div className="mt-1 flex items-center justify-center gap-0.5 border-slate-100 border-t pt-1.5">
				<ShiftBadge
					count={counts?.morning || 0}
					min={isFriday ? 3 : 20}
					max={isFriday ? 3 : 20}
					shiftType="morning"
				/>
				<ShiftBadge
					count={counts?.evening || 0}
					min={3}
					max={3}
					shiftType="evening"
				/>
				<ShiftBadge
					count={counts?.night || 0}
					min={2}
					max={2}
					shiftType="night"
				/>
			</div>
		</div>
	);
}
