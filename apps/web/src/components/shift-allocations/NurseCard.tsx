import { Button } from "@Duty-Roster/ui/components/button";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { AlertCircle, Ban, Loader2, Save, User } from "lucide-react";
import { useNurseCard } from "../../hooks/useNurseCard";
import { ShiftInput } from "./ShiftInput";
import { FourWaySlider } from "./Slider";
import type { NurseState } from "./types";

interface NurseCardProps {
	nurse: NurseState;
	totalDays: number;
	original?: NurseState;
}

export function NurseCard({ nurse, totalDays, original }: NurseCardProps) {
	const {
		state,
		isSaving,
		isUpdatingActive,
		isInvalid,
		isActive,
		hasChanged,
		sum,
		handleFieldChange,
		handleUpdate,
		handleActiveUpdate,
	} = useNurseCard({ nurse, totalDays, original });

	return (
		<div
			className={cn(
				"animate-slide-up rounded-xl border bg-white p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
				isInvalid ? "border-red-200 bg-red-50/20" : "border-slate-100/80",
			)}
		>
			<div className="mb-4 flex items-start justify-between gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2">
						<div className="w-28 font-bold text-slate-800">{state.name}</div>
						<Button
							onClick={() => handleActiveUpdate(!isActive)}
							variant="ghost"
							size={"xs"}
							disabled={isUpdatingActive}
						>
							{isUpdatingActive && (
								<Loader2 className="mr-1 h-3 w-3 animate-spin" />
							)}
							{isActive ? (
								<>
									<User className="h-3 w-3" />
									Active
								</>
							) : (
								<>
									<Ban className="h-3 w-3" />
									Inactive
								</>
							)}
						</Button>
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
						<Button
							onClick={handleUpdate}
							variant="ghost"
							size={"xs"}
							disabled={!isActive || isSaving}
							className="bg-lime-100 text-lime-700 transition duration-300 hover:bg-lime-200"
						>
							{isSaving ? (
								<Loader2 className="mr-1 h-3 w-3 animate-spin" />
							) : (
								<Save className="h-3 w-3" />
							)}
							Save
						</Button>
					)}
					<ShiftInput
						label="Day"
						color="bg-[#FDE68A]"
						value={state.morning}
						onChange={(v) => handleFieldChange("morning", v)}
						max={totalDays}
					/>
					<ShiftInput
						label="Eve"
						color="bg-[#BFDBFE]"
						value={state.evening}
						onChange={(v) => handleFieldChange("evening", v)}
						max={totalDays}
					/>
					<ShiftInput
						label="Ngt"
						color="bg-[#C4B5FD]"
						value={state.night}
						onChange={(v) => handleFieldChange("night", v)}
						max={totalDays}
					/>
					<ShiftInput
						label="Off"
						color="bg-[#E5E7EB]"
						value={state.off}
						onChange={(v) => handleFieldChange("off", v)}
						max={totalDays}
					/>
				</div>
			</div>

			<FourWaySlider
				total={totalDays}
				value={{
					morning: state.morning,
					evening: state.evening,
					night: state.night,
					off: state.off,
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
