import { SHIFT_LABELS, SHIFT_TIMES } from "./roster-matrix.constants";
import type { ShiftType } from "./roster-matrix.types";

export function RosterLegend() {
	const items: { type: ShiftType; label: string; description: string }[] = [
		{
			type: "morning",
			label: SHIFT_LABELS.morning,
			description: SHIFT_TIMES.morning,
		},
		{
			type: "evening",
			label: SHIFT_LABELS.evening,
			description: SHIFT_TIMES.evening,
		},
		{
			type: "night",
			label: SHIFT_LABELS.night,
			description: SHIFT_TIMES.night,
		},
		{ type: "off", label: SHIFT_LABELS.off, description: SHIFT_TIMES.off },
	];

	const colors: Record<ShiftType, string> = {
		morning: "bg-amber-400 ring-amber-500/50",
		evening: "bg-indigo-400 ring-indigo-500/50",
		night: "bg-slate-500 ring-slate-600/50",
		off: "bg-slate-200 ring-slate-400/50",
	};

	return (
		<div className="flex flex-wrap items-center justify-center gap-6 rounded-xl border-2 border-slate-200 border-dashed bg-slate-50/80 p-6 dark:border-slate-700 dark:bg-slate-900/50">
			<span className="mr-4 font-bold text-2xl text-muted-foreground uppercase tracking-wide">
				Legend
			</span>
			{items.map((item) => (
				<div
					key={item.type}
					className="flex items-center gap-4 rounded-lg border-2 border-slate-200 bg-white px-6 py-4 shadow-lg dark:border-slate-700 dark:bg-slate-800"
				>
					<div className={`h-8 w-8 rounded-full ring-4 ${colors[item.type]}`} />
					<div className="flex flex-col">
						<span className="font-bold text-xl leading-none">{item.label}</span>
						<span className="text-lg text-muted-foreground">
							{item.description}
						</span>
					</div>
				</div>
			))}
		</div>
	);
}
