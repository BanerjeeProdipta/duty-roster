"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import { AlertCircle, Ban, Loader2, Save, User } from "lucide-react";
import { ShiftInput } from "@/features/shift-manager/components/ShiftInput";
import { FourWaySlider } from "@/features/shift-manager/components/Slider";
import { useNurseCard } from "../hooks/useNurseCard";
import type { NurseState, ShiftField } from "../types";

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
		isSaving,
		isUpdatingActive,
		handleFieldChange,
		handleSave,
		handleToggleActive,
	} = useNurseCard({ nurse, totalDays });

	return (
		<div
			className={cn(
				"animate-slide-up rounded-xl border bg-white p-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
				isInvalid ? "border-red-200 bg-red-50/20" : "border-slate-100/80",
			)}
		>
			<div className="mb-4 flex items-start justify-between gap-2">
				<div className="flex flex-wrap items-center gap-1">
					<div className="flex items-center gap-2">
						<ActiveToggle
							name={nurse.name}
							active={draft.active}
							loading={isUpdatingActive}
							onToggle={handleToggleActive}
						/>
					</div>
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
							loading={isSaving}
							disabled={!draft.active}
							onClick={handleSave}
						/>
					)}
					{(["morning", "evening", "night", "off"] as ShiftField[]).map(
						(field) => (
							<ShiftInput
								key={field}
								color={shiftColor[field]}
								value={draft[field]}
								onChange={(v) => handleFieldChange(field, v)}
								max={totalDays}
							/>
						),
					)}
				</div>
			</div>

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

			{isInvalid && (
				<p className="mt-2 flex items-center gap-1 font-medium text-red-500 text-xs">
					<AlertCircle className="h-3 w-3" />
					Shift allocation must sum exactly to {totalDays} days.
				</p>
			)}
		</div>
	);
}

// ─── Small sub-components ────────────────────────────────────────────────────

const shiftColor: Record<
	ShiftField,
	"bg-[#FDE68A]" | "bg-[#BFDBFE]" | "bg-[#C4B5FD]" | "bg-[#E5E7EB]"
> = {
	morning: "bg-[#FDE68A]",
	evening: "bg-[#BFDBFE]",
	night: "bg-[#C4B5FD]",
	off: "bg-[#E5E7EB]",
};

function ActiveToggle({
	name,
	active,
	loading,
	onToggle,
}: {
	name: string;
	active: boolean;
	loading: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onToggle}
			disabled={loading}
			className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-sm hover:bg-slate-100"
		>
			{loading ? (
				<Loader2 className="mr-1 h-3 w-3 animate-spin" />
			) : active ? (
				<User className="h-4 w-4" />
			) : (
				<Ban className="h-4 w-4" />
			)}
			{name}
		</button>
	);
}

function SaveButton({
	loading,
	disabled,
	onClick,
}: {
	loading: boolean;
	disabled: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled || loading}
			className="inline-flex items-center gap-1 rounded-md bg-lime-100 px-2 py-1 font-medium text-lime-700 text-xs transition duration-300 hover:bg-lime-200 disabled:opacity-50"
		>
			{loading ? (
				<Loader2 className="mr-1 h-5 w-5 animate-spin" />
			) : (
				<Save className="h-6 w-6" />
			)}
		</button>
	);
}
