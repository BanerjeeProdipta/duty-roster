import { cn } from "@Duty-Roster/ui/lib/utils";
import { AlertCircle } from "lucide-react";
import { ShiftInput } from "./ShiftInput";
import { FourWaySlider } from "./Slider";
import type { NurseState } from "./types";

export function NurseCard({
	nurse,
	totalDays,
	onFieldChange,
	errors,
}: {
	nurse: NurseState;
	totalDays: number;
	onFieldChange: (field: keyof NurseState, val: number) => void;
	errors: unknown[];
	index: number;
}) {
	const sum = nurse.morning + nurse.evening + nurse.night + nurse.off;
	const isInvalid = sum !== totalDays;

	return (
		<div
			className={cn(
				"rounded-md border bg-white p-4 transition-all",
				isInvalid ? "border-red-200 bg-red-50/10" : "border-slate-200",
			)}
		>
			<div className="mb-4 flex items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<div className="font-bold text-slate-800">{nurse.name}</div>
					<div
						className={cn(
							"w-fit rounded-full px-1.5 py-0.5 font-bold text-[10px] uppercase",
							isInvalid
								? "bg-red-100 text-red-700"
								: "bg-green-100 text-green-700",
						)}
					>
						{sum} / {totalDays} Days
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<ShiftInput
						label="Day"
						color="bg-[#FDE68A]"
						value={nurse.morning}
						onChange={(v) => onFieldChange("morning", v)}
						max={totalDays}
					/>
					<ShiftInput
						label="Eve"
						color="bg-[#BFDBFE]"
						value={nurse.evening}
						onChange={(v) => onFieldChange("evening", v)}
						max={totalDays}
					/>
					<ShiftInput
						label="Ngt"
						color="bg-[#C4B5FD]"
						value={nurse.night}
						onChange={(v) => onFieldChange("night", v)}
						max={totalDays}
					/>
					<ShiftInput
						label="Off"
						color="bg-[#E5E7EB]"
						value={nurse.off}
						onChange={(v) => onFieldChange("off", v)}
						max={totalDays}
					/>
				</div>
			</div>

			<FourWaySlider
				total={totalDays}
				value={{
					morning: nurse.morning,
					evening: nurse.evening,
					night: nurse.night,
					off: nurse.off,
				}}
				onChange={(v) => {
					onFieldChange("morning", v.morning);
					onFieldChange("evening", v.evening);
					onFieldChange("night", v.night);
					onFieldChange("off", v.off);
				}}
			/>

			{isInvalid && (
				<p className="mt-2 flex items-center gap-1 font-medium text-[10px] text-red-500">
					<AlertCircle className="h-3 w-3" />
					Shift allocation must sum exactly to {totalDays} days.
				</p>
			)}
		</div>
	);
}
