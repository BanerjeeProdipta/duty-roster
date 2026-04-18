"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@Duty-Roster/ui/components/dropdown-menu";
import { useState } from "react";
import {
	SHIFT_ICONS,
	SHIFT_LABELS,
	SHIFT_OPTIONS,
	SHIFT_STYLES,
	SHIFT_TIMES,
} from "./roster-matrix.constants";
import type { ShiftType } from "./roster-matrix.types";

interface ShiftBadgeProps {
	type: ShiftType;
	nurseName: string;
	date: string;
	onChange?: (type: ShiftType) => void;
}

const shiftIconBg = (value: ShiftType) =>
	value === "morning"
		? "bg-amber-200 text-amber-900"
		: value === "evening"
			? "bg-blue-200 text-blue-900"
			: value === "night"
				? "bg-violet-200 text-violet-900"
				: "bg-slate-200 text-slate-500";

export function ShiftBadge({
	type,
	nurseName,
	date,
	onChange,
}: ShiftBadgeProps) {
	const [open, setOpen] = useState(false);

	const badge = (
		<div
			className={`flex h-12 w-12 items-center justify-center rounded-lg font-bold text-lg shadow-sm transition-all duration-200 hover:translate-y-[1px] hover:scale-105 ${
				onChange ? "cursor-pointer" : ""
			} ${SHIFT_STYLES[type]}`}
			title={`${nurseName} - ${date}: ${SHIFT_LABELS[type]} (${SHIFT_TIMES[type]})`}
		>
			{SHIFT_ICONS[type]}
		</div>
	);

	if (!onChange) return badge;

	const handleChange = (value: ShiftType) => {
		onChange(value);
		setOpen(false);
	};

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
					value={type}
					onValueChange={handleChange}
					className="-mt-1"
				>
					{SHIFT_OPTIONS.map((item) => (
						<DropdownMenuRadioItem
							key={item.value}
							value={item.value}
							className={`mb-2 flex cursor-pointer items-center gap-3 rounded-md px-2 py-1 transition-all duration-200 ease-out ${
								type === item.value
									? "bg-primary/10 ring-1 ring-primary"
									: "hover:bg-slate-50"
							}`}
						>
							<div
								className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors duration-200 ${shiftIconBg(
									item.value,
								)} text-lg`}
							>
								{item.icon}
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
