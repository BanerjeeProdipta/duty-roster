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

export function ShiftBadge({
	type,
	nurseName,
	date,
	onChange,
}: ShiftBadgeProps) {
	const [open, setOpen] = useState(false);

	const badge = (
		<div
			className={`inline-flex h-16 w-16 items-center justify-center rounded-md border-2 font-bold text-xl shadow-lg transition-all hover:scale-105 hover:shadow-xl ${onChange ? "cursor-pointer ring-2 ring-transparent hover:ring-primary/50" : ""} ${SHIFT_STYLES[type]}`}
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
			<DropdownMenuTrigger className="cursor-pointer rounded-md transition-all hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1">
				{badge}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-80 rounded-md border-2 p-3 shadow-2xl"
				align="center"
				sideOffset={8}
			>
				<div className="mb-3 border-b pb-3">
					<p className="font-bold text-lg">{nurseName}</p>
					<p className="text-base text-muted-foreground">{date}</p>
				</div>
				<DropdownMenuRadioGroup value={type} onValueChange={handleChange}>
					{SHIFT_OPTIONS.map((item) => (
						<DropdownMenuRadioItem
							key={item.value}
							value={item.value}
							className={`my-2 flex cursor-pointer items-center gap-4 rounded-md py-4 pr-6 pl-4 text-lg transition-all ${
								type === item.value
									? "bg-primary/10 ring-2 ring-primary"
									: "hover:bg-slate-100 dark:hover:bg-slate-800"
							}`}
						>
							<div
								className={`flex h-12 w-12 items-center justify-center rounded-md text-2xl ${
									item.value === "morning"
										? "bg-[#FDE68A] text-amber-900"
										: item.value === "evening"
											? "bg-[#BFDBFE] text-blue-900"
											: item.value === "night"
												? "bg-[#C4B5FD] text-violet-900"
												: "bg-slate-200 text-slate-500"
								}`}
							>
								{item.icon}
							</div>
							<div className="flex flex-col">
								<span className="font-bold text-lg">{item.label}</span>
								<span className="text-base text-muted-foreground">
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
