"use client";

import { Label } from "@Duty-Roster/ui/components/label";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { FileUser, Moon, Sun, Sunset } from "lucide-react";

const shiftConfig = {
	total: {
		label: "Shift",
		bg: "bg-slate-400",
		bgLight: "bg-slate-50",
		bgDark: "bg-slate-700",
		text: "text-slate-700",
		border: "border-slate-200",
		Icon: FileUser,
	},
	morning: {
		label: "Morning",
		bg: "bg-[#FDE68A]",
		bgLight: "bg-amber-50",
		bgDark: "bg-amber-900",
		text: "text-amber-900",
		border: "border-amber-200",
		Icon: Sun,
	},
	evening: {
		label: "Evening",
		bg: "bg-[#BFDBFE]",
		bgLight: "bg-blue-50",
		bgDark: "bg-blue-900",
		text: "text-blue-900",
		border: "border-blue-200",
		Icon: Sunset,
	},
	night: {
		label: "Night",
		bg: "bg-[#C4B5FD]",
		bgLight: "bg-violet-50",
		bgDark: "bg-violet-900",
		text: "text-violet-900",
		border: "border-violet-200",
		Icon: Moon,
	},
};

type ShiftType = "total" | "morning" | "evening" | "night";

interface ShiftCountCardProps {
	shift: ShiftType;
	required: number;
	assigned: number;
	capacity: number;
}

export function ShiftCountCard({
	shift,
	required,
	assigned,
	capacity,
}: ShiftCountCardProps) {
	const config = shiftConfig[shift];
	const isFulfilled = assigned >= required;
	const assignedPct = required > 0 ? (assigned / required) * 100 : 0;

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
					<p>{Math.max(0, required - assigned)}</p>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-2">
				<div className="flex flex-col items-center rounded-lg bg-white/60 p-2">
					<Label className="text-[10px]">Required</Label>
					<span className={cn("font-bold text-lg", config.text)} suppressHydrationWarning>
						{required}
					</span>
				</div>
				<div className="flex flex-col items-center rounded-lg bg-white/60 p-2">
					<Label className="text-[10px]">Assigned</Label>
					<span className={cn("font-bold text-lg", config.text)} suppressHydrationWarning>
						{assigned}
					</span>
				</div>
				<div className="flex flex-col items-center rounded-lg bg-white/60 p-2">
					<Label className="text-[10px]">Preference</Label>
					<span className={cn("font-bold text-lg", config.text)} suppressHydrationWarning>
						{Math.round(capacity)}
					</span>
				</div>
			</div>

			<div className="flex flex-col gap-1">
				<div
					className={cn(
						"relative h-2 w-full overflow-hidden rounded-full",
						config.bgDark,
					)}
				>
					<div
						className={cn("absolute h-full", config.bg)}
						style={{
							width: `${Math.min(assignedPct, 100)}%`,
						}}
					/>
				</div>
			</div>
		</div>
	);
}

export type { ShiftType };
