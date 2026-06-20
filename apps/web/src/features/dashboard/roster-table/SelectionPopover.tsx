"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@Duty-Roster/ui/components/dialog";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { Coffee, Moon, Sun, Sunset } from "lucide-react";
import { SHIFT_LABELS, SHIFT_TIMES } from "./RosterMatrix.constants";
import type { ShiftType } from "./RosterMatrix.types";

const SMALL_ICONS: Record<ShiftType, React.ReactNode> = {
	morning: <Sun className="h-5 w-5" />,
	evening: <Sunset className="h-5 w-5" />,
	night: <Moon className="h-5 w-5" />,
	off: <Coffee className="h-5 w-5" />,
};

interface SelectionPopoverProps {
	nurseName: string;
	startDateStr: string;
	endDateStr: string;
	onSelect: (value: ShiftType) => void;
	onDismiss: () => void;
}

const bgHover: Record<ShiftType, string> = {
	morning: "hover:bg-amber-100 hover:text-amber-900",
	evening: "hover:bg-blue-100 hover:text-blue-900",
	night: "hover:bg-violet-100 hover:text-violet-900",
	off: "hover:bg-gray-100 hover:text-gray-700",
};

const iconColor: Record<ShiftType, string> = {
	morning: "text-amber-600",
	evening: "text-blue-600",
	night: "text-violet-600",
	off: "text-gray-400",
};

function formatDateLabel(dateStr: string) {
	const date = new Date(`${dateStr}T00:00:00`);
	const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	const dayName = days[date.getDay()];
	const monthName = months[date.getMonth()];
	const day = date.getDate();
	return `${dayName}, ${monthName} ${day}`;
}

const shiftOptions: {
	value: ShiftType;
	label: string;
	icon: React.ReactNode;
	time: string;
}[] = [
	{
		value: "morning",
		label: SHIFT_LABELS.morning,
		icon: SMALL_ICONS.morning,
		time: SHIFT_TIMES.morning,
	},
	{
		value: "evening",
		label: SHIFT_LABELS.evening,
		icon: SMALL_ICONS.evening,
		time: SHIFT_TIMES.evening,
	},
	{
		value: "night",
		label: SHIFT_LABELS.night,
		icon: SMALL_ICONS.night,
		time: SHIFT_TIMES.night,
	},
	{
		value: "off",
		label: SHIFT_LABELS.off,
		icon: SMALL_ICONS.off,
		time: SHIFT_TIMES.off,
	},
];

export function SelectionPopover({
	nurseName,
	startDateStr,
	endDateStr,
	onSelect,
	onDismiss,
}: SelectionPopoverProps) {
	const isSameDay = startDateStr === endDateStr;

	const startLabel = formatDateLabel(startDateStr);
	const endLabel = formatDateLabel(endDateStr);

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onDismiss();
			}}
		>
			<DialogContent className="w-72 p-4">
				<DialogHeader className="mb-3">
					<DialogTitle className="font-semibold text-sm">
						{nurseName}
					</DialogTitle>
					<div className="mt-2 flex gap-3 text-xs">
						{isSameDay ? (
							<div className="flex items-center gap-1.5">
								<span className="font-medium text-gray-400 uppercase">
									Date
								</span>
								<span className="font-medium text-gray-700">{startLabel}</span>
							</div>
						) : (
							<>
								<div className="flex items-center gap-1.5">
									<span className="font-medium text-gray-400 uppercase">
										Start
									</span>
									<span className="font-medium text-gray-700">
										{startLabel}
									</span>
								</div>
								<div className="h-4 w-px bg-gray-300" />
								<div className="flex items-center gap-1.5">
									<span className="font-medium text-gray-400 uppercase">
										End
									</span>
									<span className="font-medium text-gray-700">{endLabel}</span>
								</div>
							</>
						)}
					</div>
				</DialogHeader>

				<div className="flex flex-col gap-1">
					{shiftOptions.map((item) => (
						<button
							type="button"
							key={item.value}
							onClick={() => onSelect(item.value)}
							className={cn(
								"flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-200",
								"border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm",
								bgHover[item.value],
							)}
						>
							<div
								className={cn(
									"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base",
									iconColor[item.value],
									item.value === "morning" && "bg-amber-50",
									item.value === "evening" && "bg-blue-50",
									item.value === "night" && "bg-violet-50",
									item.value === "off" && "bg-gray-50",
								)}
							>
								{item.icon}
							</div>
							<div className="flex flex-1 items-center justify-between">
								<span className="font-medium text-sm">{item.label}</span>
								<span className="text-[11px] text-gray-400">{item.time}</span>
							</div>
						</button>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
