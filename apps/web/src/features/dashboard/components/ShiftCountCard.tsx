"use client";

import { Label } from "@Duty-Roster/ui/components/label";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { FileUser, Moon, Sun, Sunset } from "lucide-react";

const shiftConfig = {
	total: {
		label: "Shift",
		bgLight: "bg-slate-50",
		bgDark: "bg-slate-700",
		text: "text-slate-700",
		border: "border-slate-200",
		Icon: FileUser,
	},
	morning: {
		label: "Morning",
		bgLight: "bg-amber-50",
		text: "text-amber-900",
		border: "border-amber-200",
		Icon: Sun,
	},
	evening: {
		label: "Evening",
		bgLight: "bg-blue-50",
		text: "text-blue-900",
		border: "border-blue-200",
		Icon: Sunset,
	},
	night: {
		label: "Night",
		bgLight: "bg-violet-50",
		text: "text-violet-900",
		border: "border-violet-200",
		Icon: Moon,
	},
};

export type ShiftType = "total" | "morning" | "evening" | "night";

interface ShiftCountCardProps {
	shift: ShiftType;
	required: number;
	preference?: number;
	assigned?: number;
	available?: number;
	capacity?: number;
}

export function ShiftCountCard({
	shift,
	required,
	preference,
	assigned,
	available,
	capacity,
}: ShiftCountCardProps) {
	const config = shiftConfig[shift];
	const isFulfilled = (assigned ?? preference ?? 0) >= required;
	const displayValue = assigned ?? preference ?? 0;
	const displayPct = required > 0 ? (displayValue / required) * 100 : 0;

	return (
		<div
			className={cn(
				"flex flex-col gap-2 rounded-2xl border p-3 sm:p-4",
				config.bgLight,
				config.border,
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<config.Icon className={cn("h-5 w-5", config.text)} />
					<span className={cn("font-semibold text-sm", config.text)}>
						{config.label}
					</span>
				</div>
				<div
					className={cn(
						"inline-flex items-center gap-1 font-semibold text-sm",
						isFulfilled ? "text-slate-600" : "text-rose-500",
					)}
				>
					<Label variant="inline">Needed:</Label>
					<p>{Math.max(0, required - displayValue)}</p>
				</div>
			</div>

			<div className={cn("grid gap-2", "grid-cols-3")}>
				<div className="flex flex-col items-center rounded-lg bg-white/60 p-2">
					<Label className="text-[10px]">Required</Label>
					<span className={cn("font-bold text-lg", config.text)}>
						{required}
					</span>
				</div>
				{(preference !== undefined || assigned !== undefined) && (
					<div className="flex flex-col items-center rounded-lg bg-white/60 p-2">
						<Label className="text-[10px]">
							{assigned !== undefined ? "Assigned" : "Preference"}
						</Label>
						<span className={cn("font-bold text-lg", config.text)}>
							{displayValue}
						</span>
					</div>
				)}
				{available !== undefined && (
					<div className="flex flex-col items-center rounded-lg bg-white/60 p-2">
						<Label className="text-[10px]">Assignable</Label>
						<span
							className={cn(
								"font-bold text-lg",
								available >= required ? "text-green-600" : "text-rose-600",
							)}
						>
							{available}
						</span>
					</div>
				)}
				{capacity !== undefined && (
					<div className="flex flex-col items-center rounded-lg bg-white/60 p-2">
						<Label className="text-[10px]">Preference</Label>
						<span className={cn("font-bold text-lg", config.text)}>
							{Math.round(capacity)}
						</span>
					</div>
				)}
			</div>

			{assigned !== undefined && (
				<div className="flex flex-col gap-1">
					<div
						className={cn(
							"relative h-2 w-full overflow-hidden rounded-full",
							config.bgDark,
						)}
					>
						<div
							className="absolute h-full bg-[#FDE68A]"
							style={{
								width: `${Math.min(displayPct, 100)}%`,
							}}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
