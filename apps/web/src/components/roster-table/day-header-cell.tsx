import { cn } from "@Duty-Roster/ui/lib/utils";
import { LAYOUT } from "./constants";

export function DayHeaderCell({
	date,
	counts,
}: {
	date: { label: string; formatted: string; isToday: boolean };
	counts: { morning: number; evening: number; night: number } | undefined;
}) {
	return (
		<th
			className={cn(
				"whitespace-nowrap border-r border-b text-center font-semibold text-xs uppercase tracking-wide transition-colors",
				date.isToday ? "bg-primary/5" : "bg-white",
			)}
			style={{
				height: LAYOUT.headerHeight,
				minWidth: "120px",
				padding: "10px",
			}}
		>
			<span className="mb-0.5 block font-black text-slate-900">
				{date.label}
			</span>
			<span className="mb-2 block font-medium font-mono text-[10px] text-slate-400">
				{date.formatted}
			</span>

			<div className="mt-1 flex items-center justify-center gap-1.5 border-slate-100 border-t pt-1.5">
				<div
					className="flex items-center gap-1 whitespace-nowrap rounded bg-slate-50 px-1.5 py-0.5 font-black text-[10px] text-slate-500"
					title="Morning total"
				>
					<div className="h-2 w-2 rounded-full bg-[#FDE68A]" />
					<span>{counts?.morning || 0}</span>
				</div>
				<div
					className="flex items-center gap-1 whitespace-nowrap rounded bg-slate-50 px-1.5 py-0.5 font-black text-[10px] text-slate-500"
					title="Evening total"
				>
					<div className="h-2 w-2 rounded-full bg-[#BFDBFE]" />
					<span>{counts?.evening || 0}</span>
				</div>
				<div
					className="flex items-center gap-1 whitespace-nowrap rounded bg-slate-50 px-1.5 py-0.5 font-black text-[10px] text-slate-500"
					title="Night total"
				>
					<div className="h-2 w-2 rounded-full bg-[#C4B5FD]" />
					<span>{counts?.night || 0}</span>
				</div>
			</div>
		</th>
	);
}
