import { cn } from "@Duty-Roster/ui/lib/utils";
import Link from "next/link";
import { AllocationItem } from "./AllocationItem";

export function NurseIdentityCell({
	nurse,
	counts,
	pref,
	totalDays,
	editable,
}: {
	nurse: { id: string; name: string; active?: boolean };
	counts: { morning: number; evening: number; night: number } | undefined;
	pref?: { morning?: number; evening?: number; night?: number } | undefined;
	totalDays: number;
	editable?: boolean;
}) {
	const totalAssigned =
		(counts?.morning || 0) + (counts?.evening || 0) + (counts?.night || 0);

	const targetWorkedDays =
		pref?.morning ?? 0 + pref?.evening ?? 0 + pref?.night ?? 0;

	const isOverWorked = totalAssigned > targetWorkedDays;
	const isPerfect = totalAssigned === targetWorkedDays;

	return (
		<div
			className={cn(
				"h-full w-full border-r border-b bg-white px-3 py-3 transition-colors duration-200 hover:bg-slate-50/80",
				nurse.active === false && "opacity-60 grayscale",
			)}
		>
			<div className="flex h-full flex-col justify-center gap-2">
				<div className="flex items-center justify-between gap-1 overflow-hidden">
					<Link href={`/shift-preference?q=${nurse.name}`}>
						<span
							className={cn(
								"truncate font-extrabold text-sm",
								editable &&
									"cursor-pointer text-blue-900 hover:text-blue-800 hover:underline",
								!editable && "text-slate-900",
							)}
							title={nurse.name}
						>
							{nurse?.name || "Nurse"}
						</span>
					</Link>
					<div
						className={cn(
							"shrink-0 rounded-md border px-1.5 py-0.5 font-black text-[9px]",
							isOverWorked
								? "border-red-200 bg-red-50 text-red-700"
								: isPerfect
									? "border-green-200 bg-green-50 text-green-700"
									: "border-slate-200 bg-slate-50 text-slate-600",
						)}
						title={`Total assigned: ${totalAssigned} / Goal: ${targetWorkedDays}`}
					>
						{totalAssigned}/{targetWorkedDays}
					</div>
				</div>

				<div className="flex items-center justify-between gap-1">
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
