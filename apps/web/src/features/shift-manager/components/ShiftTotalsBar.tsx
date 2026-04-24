"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import { UserCheck, UserMinus } from "lucide-react";
import type { NurseState } from "../types";

interface ShiftTotalsBarProps {
	nurses: NurseState[];
}

export function ShiftTotalsBar({ nurses }: ShiftTotalsBarProps) {
	const activeCount = nurses.filter((n) => n.active !== false).length;
	const inactiveCount = nurses.length - activeCount;

	return (
		<div className="flex items-center justify-center gap-4 rounded-lg bg-slate-50 px-4 py-3">
			<TotalItem
				value={activeCount}
				icon={<UserCheck className="h-4 w-4" />}
				className="text-green-600"
			/>
			<TotalItem
				value={inactiveCount}
				icon={<UserMinus className="h-4 w-4" />}
				className="text-rose-400"
			/>
		</div>
	);
}

function TotalItem({
	value,
	icon,
	className,
}: {
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
