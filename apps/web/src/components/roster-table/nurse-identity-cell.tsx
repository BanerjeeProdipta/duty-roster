import { cn } from "@Duty-Roster/ui/lib/utils";
import { AllocationItem } from "./allocation-item";

export function NurseIdentityCell({
	nurse,
	counts,
	pref,
}: {
	nurse: { id: string; name: string };
	counts: { morning: number; evening: number; night: number } | undefined;
	pref: { morning: number; evening: number; night: number } | undefined;
	totalDays: number;
}) {
	const totalAssigned =
		(counts?.morning || 0) + (counts?.evening || 0) + (counts?.night || 0);
	const targetWorkedDays =
		(pref?.morning || 0) + (pref?.evening || 0) + (pref?.night || 0);

	const isOverWorked = totalAssigned > targetWorkedDays;
	const isPerfect = totalAssigned === targetWorkedDays;

	return (
		<div className="h-full w-full border-b bg-muted/10 px-3 py-3">
			<div className="flex h-full flex-col justify-center gap-2">
				<div className="flex items-center justify-between gap-1 overflow-hidden">
					<span
						className="truncate font-extrabold text-slate-900 text-sm"
						title={nurse.name}
					>
						{nurse.name}
					</span>
					<div
						className={cn(
							"shrink-0 rounded-md border px-1.5 py-0.5 font-black text-[9px]",
							isOverWorked
								? "border-red-200 bg-red-50 text-red-700"
								: isPerfect
									? "border-green-200 bg-green-50 text-green-700"
									: "border-slate-200 bg-slate-100 text-slate-600",
						)}
						title={`Total assigned: ${totalAssigned} / Goal: ${targetWorkedDays}`}
					>
						{totalAssigned}/{targetWorkedDays}
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-1">
					<AllocationItem
						current={counts?.morning || 0}
						target={pref?.morning || 0}
						color="bg-[#FDE68A]"
						label="M"
					/>
					<AllocationItem
						current={counts?.evening || 0}
						target={pref?.evening || 0}
						color="bg-[#BFDBFE]"
						label="E"
					/>
					<AllocationItem
						current={counts?.night || 0}
						target={pref?.night || 0}
						color="bg-[#C4B5FD]"
						label="N"
					/>
				</div>
			</div>
		</div>
	);
}
