"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import {
	Ban,
	Moon,
	Sun,
	Sunset,
	UserCheck,
	UserMinus,
	Users,
} from "lucide-react";
import type { NurseState } from "../types";

interface ShiftTotalsBarProps {
	nurses: NurseState[];
}

export function ShiftTotalsBar({ nurses }: ShiftTotalsBarProps) {
	const totals = nurses.reduce(
		(acc, n) => ({
			morning: acc.morning + n.morning,
			evening: acc.evening + n.evening,
			night: acc.night + n.night,
		}),
		{ morning: 0, evening: 0, night: 0 },
	);

	const activeCount = nurses.filter((n) => n.active !== false).length;
	const inactiveCount = nurses.length - activeCount;

	return (
		<div className="flex items-center justify-center gap-4 rounded-lg bg-slate-50 px-4 py-3">
			<TotalItem
				label="Active"
				value={activeCount}
				icon={<UserCheck className="h-4 w-4" />}
				className="text-green-600"
			/>
			<TotalItem
				label="Inactive"
				value={inactiveCount}
				icon={<UserMinus className="h-4 w-4" />}
				className="text-rose-400"
			/>
		</div>
	);
}

function TotalItem({
	label,
	value,
	icon,
	className,
}: {
	label: string;
	value: number;
	icon: React.ReactNode;
	className: string;
}) {
	return (
		<div
			className={cn(
				"inline-flex items-center gap-1 font-medium text-sm",
				className,
			)}
		>
			{icon}
			{value}
		</div>
	);
}
