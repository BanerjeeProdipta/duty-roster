import { cn } from "@Duty-Roster/ui/lib/utils";
import { AllocationItem } from "./AllocationItem";
import { LAYOUT } from "./Layout";

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
				{date.label}
			</span>
			<span className="mb-2 block font-medium font-mono text-slate-400 text-xs">
				{date.formatted}
			</span>

			<div className="mt-1 flex items-center justify-center gap-1.5 border-slate-100 border-t pt-1.5">
				<AllocationItem
					current={counts?.morning || 0}
					target={isFriday ? 3 : 20}
					color="bg-[#FDE68A]"
					label="M"
					min={isFriday ? 3 : 20}
					shiftType="morning"
				/>
				<AllocationItem
					current={counts?.evening || 0}
					target={3}
					color="bg-[#BFDBFE]"
					label="E"
					min={3}
					shiftType="evening"
				/>
				<AllocationItem
					current={counts?.night || 0}
					target={2}
					color="bg-[#C4B5FD]"
					label="N"
					min={2}
					shiftType="night"
				/>
			</div>
		</div>
	);
}
