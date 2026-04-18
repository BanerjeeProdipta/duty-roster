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
			className={`inline-flex h-14 w-14 items-center justify-center rounded-xl border-0 font-bold text-xl shadow-[0_4px_12px_rgb(0,0,0,0.08)] transition-all duration-300 hover:scale-110 hover:shadow-[0_8px_20px_rgb(0,0,0,0.12)] ${onChange ? "cursor-pointer" : ""} ${SHIFT_STYLES[type]}`}
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
			<DropdownMenuTrigger className="cursor-pointer rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary/20">
				{badge}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-80 animate-fade-in rounded-2xl border-0 bg-white/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl"
				align="center"
				sideOffset={12}
			>
				<div className="mb-4 space-y-1 border-slate-100 border-b px-1 pb-3 text-center">
					<p className="font-extrabold text-slate-900 text-xl tracking-tight">
						{nurseName}
					</p>
					<p className="font-semibold text-slate-400 text-sm uppercase tracking-wider">
						{date}
					</p>
				</div>
				<DropdownMenuRadioGroup value={type} onValueChange={handleChange}>
					{SHIFT_OPTIONS.map((item) => (
						<DropdownMenuRadioItem
							key={item.value}
							value={item.value}
							className={`my-2 flex cursor-pointer items-center gap-4 rounded-md py-4 pr-6 pl-4 text-lg transition-all ${
								type === item.value
									? "bg-primary/10 ring-2 ring-primary"
									: "hover:bg-slate-50 dark:hover:bg-slate-800"
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
