"use client";

import { Label } from "@Duty-Roster/ui/components/label";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";
import { ShiftCountCard } from "../shift-allocations/ShiftCountCard";

export function ShiftCounts({
	year: providedYear,
	month: providedMonth,
}: {
	year?: number;
	month?: number;
}) {
	const { year, month } = useMemo(() => {
		const now = new Date();
		return {
			year: providedYear ?? now.getFullYear(),
			month: providedMonth ?? now.getMonth() + 1,
		};
	}, [providedYear, providedMonth]);

	const { data, isLoading } = useQuery({
		queryKey: QUERY_KEYS.shiftRequirements(year, month),
		queryFn: () =>
			trpcClient.roster.getMonthlyShiftRequirements.query({ year, month }),
	});

	if (isLoading) {
		return (
			<div className="flex h-16 items-center justify-center rounded-xl bg-slate-50">
				<span className="text-slate-500 text-xs">Loading...</span>
			</div>
		);
	}

	if (!data) return null;

	const {
		shiftRequirements,
		assignedShiftCounts,
		preferenceCapacity,
		dayOfWeekCounts,
	} = data;

	const dayLabels: Record<string, { label: string; count: number }> = {
		monday: { label: "Mon", count: dayOfWeekCounts.monday },
		tuesday: { label: "Tue", count: dayOfWeekCounts.tuesday },
		wednesday: { label: "Wed", count: dayOfWeekCounts.wednesday },
		thursday: { label: "Thu", count: dayOfWeekCounts.thursday },
		friday: { label: "Fri", count: dayOfWeekCounts.friday },
		saturday: { label: "Sat", count: dayOfWeekCounts.saturday },
		sunday: { label: "Sun", count: dayOfWeekCounts.sunday },
	};

	const totalRequired =
		shiftRequirements.morning +
		shiftRequirements.evening +
		shiftRequirements.night;
	const totalAssigned =
		assignedShiftCounts.morning +
		assignedShiftCounts.evening +
		assignedShiftCounts.night;
	const totalCapacity =
		preferenceCapacity.morning +
		preferenceCapacity.evening +
		preferenceCapacity.night;

	return (
		<div className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:p-4">
			<div className="flex flex-col gap-3">
				<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
					<span className="font-semibold text-slate-800 text-sm">
						{new Date(year, month - 1).toLocaleDateString("en-US", {
							month: "short",
							year: "numeric",
						})}
					</span>
					<div className="flex flex-wrap gap-1">
						{Object.values(dayLabels).map((day) => (
							<div
								key={day.label}
								className="flex items-center gap-1 rounded bg-slate-50 px-1.5 py-0.5 text-xs"
							>
								<span className="font-medium text-slate-600">{day.label}</span>
								<span className="text-slate-400">{day.count}</span>
							</div>
						))}
					</div>
				</div>

				<div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
					<div className="flex flex-col">
						<Label>Required</Label>
						<span className="font-bold text-slate-800 text-xl">
							{totalRequired}
						</span>
					</div>
					<div className="flex flex-col items-center">
						<Label>Assigned</Label>
						<span
							className={`font-bold text-xl ${
								totalAssigned >= totalRequired
									? "text-green-600"
									: "text-red-500"
							}`}
						>
							{totalAssigned}
						</span>
					</div>
					<div className="flex flex-col">
						<Label>Needed</Label>
						<span className="font-bold text-slate-800 text-xl">
							{Math.max(0, totalRequired - totalAssigned)}
						</span>
					</div>
					<div className="flex flex-col items-end">
						<Label>Capacity</Label>
						<span className="font-bold text-slate-600 text-xl">
							{Math.round(totalCapacity)}
						</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<ShiftCountCard
					shift="morning"
					required={shiftRequirements.morning}
					assigned={assignedShiftCounts.morning}
					capacity={preferenceCapacity.morning}
				/>
				<ShiftCountCard
					shift="evening"
					required={shiftRequirements.evening}
					assigned={assignedShiftCounts.evening}
					capacity={preferenceCapacity.evening}
				/>
				<ShiftCountCard
					shift="night"
					required={shiftRequirements.night}
					assigned={assignedShiftCounts.night}
					capacity={preferenceCapacity.night}
				/>
			</div>
		</div>
	);
}
