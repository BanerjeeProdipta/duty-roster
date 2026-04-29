"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import { AlertCircle } from "lucide-react";
import { FourWaySlider } from "@/features/shift-manager/components/Slider";
import { useNurseCard } from "@/features/shift-manager/hooks/useNurseCard";
import type { NurseState } from "@/features/shift-manager/types";
import { ActiveToggle } from "./ActiveToggle";
import { SaveButton } from "./SaveButton";
import { ShiftInputs } from "./ShiftInputs";

interface NurseCardProps {
	nurse: NurseState;
	totalDays: number;
}

export function NurseCard({ nurse, totalDays }: NurseCardProps) {
	const {
		draft,
		sum,
		isInvalid,
		hasChanged,
		isSavingPending,
		isToggleActivePending,
		handleFieldChange,
		handleSave,
		handleToggleActive,
	} = useNurseCard({ nurse, totalDays });

	return (
		<div
			className={cn(
				"animate-slide-up rounded-xl border bg-white p-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
				isInvalid ? "border-red-200 bg-red-50/20" : "border-slate-100/80",
			)}
		>
			{/* Header: Active toggle, count summary, save button, and shift inputs */}
			<div className="mb-4 flex items-start justify-between gap-2">
				<div className="flex flex-wrap items-center gap-1">
					<ActiveToggle
						name={nurse.name}
						active={draft.active}
						isPending={isToggleActivePending}
						onToggle={handleToggleActive}
					/>
					<span
						className={cn(
							"font-medium text-xs",
							isInvalid ? "text-red-600" : "text-slate-500",
						)}
					>
						{sum}/{totalDays}
					</span>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{hasChanged && (
						<SaveButton
							isPending={isSavingPending}
							disabled={!draft.active}
							onClick={handleSave}
						/>
					)}
					<ShiftInputs
						values={{
							morning: draft.morning,
							evening: draft.evening,
							night: draft.night,
							off: draft.off,
						}}
						onChange={handleFieldChange}
						max={totalDays}
					/>
				</div>
			</div>

			{/* Four-way slider for visual adjustment */}
			<FourWaySlider
				total={totalDays}
				value={{
					morning: draft.morning,
					evening: draft.evening,
					night: draft.night,
					off: draft.off,
				}}
				onChange={(v) => {
					handleFieldChange("morning", v.morning);
					handleFieldChange("evening", v.evening);
					handleFieldChange("night", v.night);
				}}
			/>

			{/* Validation error message */}
			{isInvalid && (
				<p className="mt-2 flex items-center gap-1 font-medium text-red-500 text-xs">
					<AlertCircle className="h-3 w-3" />
					Shift allocation must sum exactly to {totalDays} days.
				</p>
			)}
		</div>
	);
}
