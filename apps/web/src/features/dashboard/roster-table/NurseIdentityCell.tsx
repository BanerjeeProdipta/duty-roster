import { cn } from "@Duty-Roster/ui/lib/utils";
import Link from "next/link";
import { SHIFT_BADGE_STYLES } from "./RosterMatrix.constants";

interface ShiftBadgeProps {
	current: number;
	target: number;
	shiftType: "morning" | "evening" | "night";
}

function ShiftBadge({ current, target, shiftType }: ShiftBadgeProps) {
	const isOver = current > target;

	return (
		<span
			className={cn(
				"relative inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-[10px] opacity-70",
				SHIFT_BADGE_STYLES[shiftType],
			)}
			title={`${shiftType.charAt(0).toUpperCase() + shiftType.slice(1)}: ${current} / ${target}`}
		>
			{isOver && (
				<span className="relative flex h-1.5 w-1.5">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
					<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
				</span>
			)}
			<span>
				{current}/{target}
			</span>
		</span>
	);
}

export function NurseIdentityCell({
	nurse,
	counts,
	pref,
	editable,
}: {
	nurse: { id: string; name: string; active?: boolean };
	counts: { morning: number; evening: number; night: number } | undefined;
	pref?: { morning?: number; evening?: number; night?: number } | undefined;
	editable?: boolean;
}) {
	const totalAssigned =
		(counts?.morning || 0) + (counts?.evening || 0) + (counts?.night || 0);

	const targetWorkedDays =
		(pref?.morning ?? 0) + (pref?.evening ?? 0) + (pref?.night ?? 0);

	const isOverWorked = totalAssigned > targetWorkedDays;
	const isPerfect = totalAssigned === targetWorkedDays;

	return (
		<div
			className={cn(
				"relative h-full w-full border-r border-b bg-white px-3 py-3 transition-colors duration-200 hover:bg-slate-50/80",
				nurse.active === false && "opacity-60 grayscale",
			)}
		>
			<div className="flex h-full flex-col justify-center gap-2">
				<div className="flex items-center justify-between gap-1 overflow-hidden">
					{editable ? (
						<Link href={`/manage-users?q=${nurse.name}`}>
							<span
								className={cn(
									"cursor-pointer truncate font-extrabold text-blue-900 text-sm hover:text-blue-800 hover:underline",
								)}
								title={nurse.name}
							>
								{nurse?.name || "Nurse"}
							</span>
						</Link>
					) : (
						<span
							className={cn("truncate font-extrabold text-slate-900 text-sm")}
							title={nurse.name}
						>
							{nurse?.name || "Nurse"}
						</span>
					)}
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

				<div className="flex items-center justify-between gap-2">
					<ShiftBadge
						current={counts?.morning || 0}
						target={pref?.morning || 0}
						shiftType="morning"
					/>
					<ShiftBadge
						current={counts?.evening || 0}
						target={pref?.evening || 0}
						shiftType="evening"
					/>
					<ShiftBadge
						current={counts?.night || 0}
						target={pref?.night || 0}
						shiftType="night"
					/>
				</div>
			</div>
		</div>
	);
}
