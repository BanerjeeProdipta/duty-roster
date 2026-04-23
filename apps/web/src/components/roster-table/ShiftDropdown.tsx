"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@Duty-Roster/ui/components/dropdown-menu";
import { startTransition, useOptimistic, useState } from "react";
import type { ShiftDefinition } from "../../hooks/useGetShifts";
import { useUpdateShift } from "../../hooks/useUpdateShift";
import { SHIFT_ICONS, SHIFT_STYLES } from "./RosterMatrix.constants";
import type { ShiftType } from "./RosterMatrix.types";

interface ShiftBadgeProps {
	type: ShiftType;
	nurseName: string;
	nurseId: string;
	date: string;
	assignmentId?: string;
	shifts: ShiftDefinition[];
}

const shiftIconBg = (value: ShiftType) =>
	value === "morning"
		? "bg-amber-200 text-amber-900"
		: value === "evening"
			? "bg-blue-200 text-blue-900"
			: value === "night"
				? "bg-violet-200 text-violet-900"
				: "bg-slate-200 text-slate-500";

const defaultLabel: Record<ShiftType, string> = {
	morning: "Morning",
	evening: "Evening",
	night: "Night",
	off: "Day Off",
};

export function ShiftBadge({
	type,
	nurseName,
	nurseId,
	date,
	assignmentId,
	shifts,
}: ShiftBadgeProps) {
	const [open, setOpen] = useState(false);
	const updateMutation = useUpdateShift();

	const [optimisticType, setOptimisticType] = useOptimistic(type);

	const handleChange = (value: ShiftType) => {
		setOpen(false);
		if (!assignmentId && value === "off") return;

		startTransition(() => {
			setOptimisticType(value);
			updateMutation.mutate({
				id: assignmentId || "new",
				shiftId: value === "off" ? null : `shift_${value}`,
				nurseId,
				dateKey: date,
			});
		});
	};

	const shiftDef = shifts.find((s) => s.name === optimisticType);
	const label = defaultLabel[optimisticType];
	const timeRange =
		optimisticType !== "off" && shiftDef
			? `${shiftDef.startTime.slice(0, 5)} - ${shiftDef.endTime.slice(0, 5)}`
			: "No shift";

	const badge = (
		<div
			className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg font-bold text-lg shadow-sm transition-all duration-200 hover:translate-y-[1px] hover:scale-105 ${
				!assignmentId ? "border-2 border-slate-300 border-dashed" : ""
			} ${SHIFT_STYLES[optimisticType]}`}
			title={`${nurseName} - ${date}: ${label} (${timeRange})`}
		>
			{SHIFT_ICONS[optimisticType]}
		</div>
	);

	const shiftOptions = [
		...shifts.map((s) => ({
			value: s.name,
			label: defaultLabel[s.name],
			time: `${s.startTime.slice(0, 5)} - ${s.endTime.slice(0, 5)}`,
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
					<p className="text-muted-foreground text-xs">{date}</p>
				</div>

				<DropdownMenuRadioGroup
					value={optimisticType}
					onValueChange={handleChange}
					className="-mt-1"
				>
					{shiftOptions.map((item) => (
						<DropdownMenuRadioItem
							key={item.value}
							value={item.value}
							className={`mb-2 flex cursor-pointer items-center gap-3 rounded-md px-2 py-1 transition-all duration-200 ease-out ${
								optimisticType === item.value
									? "bg-primary/10 ring-1 ring-primary"
									: "hover:bg-slate-50"
							}`}
						>
							<div
								className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors duration-200 ${shiftIconBg(
									item.value,
								)} text-lg`}
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
