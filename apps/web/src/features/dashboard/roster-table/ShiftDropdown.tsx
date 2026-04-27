"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@Duty-Roster/ui/components/dropdown-menu";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { useState } from "react";
import type { ShiftDefinition } from "@/hooks/useGetShifts";
import { useUpdateShift } from "@/hooks/useUpdateShift";
import { SHIFT_ICONS, SHIFT_STYLES } from "./RosterMatrix.constants";
import type { ShiftType } from "./RosterMatrix.types";

interface ShiftBadgeProps {
	type: ShiftType;
	nurseName: string;
	nurseId: string;
	date: string;
	assignmentId?: string;
	shifts: ShiftDefinition[];
	editable?: boolean;
}

const shiftIconBg: Record<ShiftType, string> = {
	morning: "bg-amber-200 text-amber-900",
	evening: "bg-blue-200 text-blue-900",
	night: "bg-violet-200 text-violet-900",
	off: "bg-slate-200 text-slate-500",
};

const defaultLabel: Record<ShiftType, string> = {
	morning: "Morning",
	evening: "Evening",
	night: "Night",
	off: "Day Off",
};

const formatTime12h = (time: string) => {
	const [hours, minutes] = time.split(":").map(Number);
	const period = hours >= 12 ? "PM" : "AM";
	const hour12 = hours % 12 || 12;
	return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const formatDateDMY = (dateStr: string) => {
	const date = new Date(`${dateStr}T00:00:00`);
	const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const dayName = days[date.getDay()];
	const day = date.getDate().toString().padStart(2, "0");
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const year = date.getFullYear();
	return `${dayName}, ${day}-${month}-${year}`;
};

export function ShiftBadge({
	type,
	nurseName,
	nurseId,
	date,
	assignmentId,
	shifts,
	editable = false,
}: ShiftBadgeProps) {
	const [open, setOpen] = useState(false);
	const updateMutation = useUpdateShift();

	const handleChange = (value: ShiftType) => {
		setOpen(false);
		if (!assignmentId && value === "off") return;

		updateMutation.mutate({
			id: assignmentId || "new",
			shiftId: value === "off" ? null : `shift_${value}`,
			nurseId,
			dateKey: date,
		});
	};

	const isPending = updateMutation.isPending;
	const shiftDef = shifts.find((s) => s.name === type);
	const label = defaultLabel[type];
	const timeRange =
		type !== "off" && shiftDef
			? `${formatTime12h(shiftDef.startTime)} - ${formatTime12h(shiftDef.endTime)}`
			: "No shift";

	const badge = (
		<div
			className={cn(
				"flex h-12 w-12 items-center justify-center rounded-lg font-bold text-lg shadow-sm",
				isPending && "animate-pulse opacity-70",
				editable &&
					"cursor-pointer transition-all duration-200 hover:translate-y-[1px] hover:scale-105",
				!assignmentId && "border-2 border-slate-300 border-dashed",
				SHIFT_STYLES[type],
			)}
			title={`${nurseName} - ${formatDateDMY(date)}: ${label} (${timeRange})`}
		>
			{SHIFT_ICONS[type]}
		</div>
	);

	if (!editable) {
		return badge;
	}

	const shiftOptions = [
		...shifts.map((s) => ({
			value: s.name,
			label: defaultLabel[s.name],
			time: `${formatTime12h(s.startTime)} - ${formatTime12h(s.endTime)}`,
		})),
		{ value: "off" as const, label: "Day Off", time: "No shift" },
	];

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger className="focus:outline-none">
				{badge}
			</DropdownMenuTrigger>

			<DropdownMenuContent
				className="w-72 rounded-xl border-0 bg-white/95 p-2 shadow-xl backdrop-blur transition-all duration-200"
				align="center"
				sideOffset={10}
			>
				<div className="mb-3 flex items-center justify-between border-b px-1 pb-2 text-center transition-all duration-200">
					<p className="font-semibold">{nurseName}</p>
					<p className="text-muted-foreground text-xs">{formatDateDMY(date)}</p>
				</div>

				<DropdownMenuRadioGroup
					value={type}
					onValueChange={handleChange}
					className="-mt-1"
				>
					{shiftOptions.map((item) => (
						<DropdownMenuRadioItem
							key={item.value}
							value={item.value}
							className={cn(
								"mb-2 flex cursor-pointer items-center gap-3 rounded-md px-2 py-1 transition-all duration-200 ease-out",
								type === item.value ? "bg-primary/10" : "hover:bg-slate-50",
							)}
						>
							<div
								className={cn(
									"flex h-10 w-10 items-center justify-center rounded-md text-lg transition-colors duration-200",
									shiftIconBg[item.value as ShiftType],
								)}
							>
								{SHIFT_ICONS[item.value]}
							</div>

							<div className="flex flex-col">
								<span className="font-medium leading-tight">{item.label}</span>
								<span className="text-muted-foreground text-xs">
									{item.time}
								</span>
							</div>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
