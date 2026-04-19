"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Moon, Sun, type Sunrise, Sunset } from "lucide-react";
import { useMemo } from "react";
import { trpcClient } from "@/utils/trpc";

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
		queryKey: ["shiftRequirements", year, month],
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

	const { shiftRequirements, assignedShiftCounts, dayOfWeekCounts } = data;

	const shifts: Record<
		string,
		{
			label: string;
			req: number;
			assigned: number;
			bg: string;
			bgLight: string;
			bgDark: string;
			text: string;
			border: string;
			Icon: typeof Sunrise;
		}
	> = {
		morning: {
			label: "Morning",
			req: shiftRequirements.morning,
			assigned: assignedShiftCounts.morning,
			bg: "bg-[#FDE68A]",
			bgLight: "bg-amber-50",
			bgDark: "bg-amber-900",
			text: "text-amber-900",
			border: "border-amber-200",
			Icon: Sun,
		},
		evening: {
			label: "Evening",
			req: shiftRequirements.evening,
			assigned: assignedShiftCounts.evening,
			bg: "bg-[#BFDBFE]",
			bgLight: "bg-blue-50",
			bgDark: "bg-blue-900",
			text: "text-blue-900",
			border: "border-blue-200",
			Icon: Sunset,
		},
		night: {
			label: "Night",
			req: shiftRequirements.night,
			assigned: assignedShiftCounts.night,
			bg: "bg-[#C4B5FD]",
			bgLight: "bg-violet-50",
			bgDark: "bg-violet-900",
			text: "text-violet-900",
			border: "border-violet-200",
			Icon: Moon,
		},
	};

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
		shifts.morning.req + shifts.evening.req + shifts.night.req;
	const totalAssigned =
		shifts.morning.assigned + shifts.evening.assigned + shifts.night.assigned;

	return (
		<div className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:p-4">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
							className="flex items-center gap-0.5 rounded bg-slate-50 px-1.5 py-0.5 text-[10px]"
						>
							<span className="font-medium text-slate-600">{day.label}</span>
							<span className="text-slate-400">{day.count}</span>
						</div>
					))}
				</div>
				<span className="text-slate-500 text-xs tabular-nums">
					<span className="text-slate-600">{totalAssigned}</span>
					<span>/{totalRequired}</span>
					{totalAssigned - totalRequired !== 0 && (
						<span
							className={
								totalAssigned >= totalRequired
									? "text-green-600"
									: "text-red-500"
							}
						>
							{totalAssigned >= totalRequired ? "+" : ""}
							{totalAssigned - totalRequired}
						</span>
					)}
				</span>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{Object.entries(shifts).map(([key, shift]) => {
					const diff = shift.assigned - shift.req;
					const isFulfilled = shift.assigned >= shift.req;
					const barWidthPct =
						shift.req > 0 ? (shift.assigned / shift.req) * 100 : 0;

					return (
						<div
							key={key}
							className={`flex flex-col gap-2 rounded-2xl border p-2 sm:p-3 ${shift.bgLight} ${shift.border}`}
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1">
									<shift.Icon
										className={`h-4 w-4 sm:h-5 sm:w-5 ${shift.text}`}
									/>
									<span className={`font-medium text-xs ${shift.text}`}>
										{shift.label}
									</span>
								</div>
								<span className={`text-xs tabular-nums ${shift.text}`}>
									{shift.assigned}
									<span className="opacity-70">/{shift.req}</span>
									{diff !== 0 && (
										<span
											className={cn(
												"ml-0.5 font-medium",
												isFulfilled ? "text-green-600" : "text-red-500",
											)}
										>
											{isFulfilled ? `+${diff}` : diff}
										</span>
									)}
								</span>
							</div>

							<div
								className={cn(
									"relative h-2 w-full overflow-hidden rounded-full sm:h-3",
									shift.bgDark,
								)}
							>
								<div
									className={`absolute h-full ${shift.bg}`}
									style={{
										width: `${Math.min(barWidthPct, 100)}%`,
									}}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
