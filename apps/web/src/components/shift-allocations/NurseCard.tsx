import { Button } from "@Duty-Roster/ui/components/button";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { AlertCircle, Ban, Save, User } from "lucide-react";
import { ShiftInput } from "./ShiftInput";
import { FourWaySlider } from "./Slider";
import type { NurseState } from "./types";

export function NurseCard({
	nurse,
	totalDays,
	onFieldChange,
	onActiveChange,
	onUpdate,
}: {
	nurse: NurseState;
	totalDays: number;
	onFieldChange: (field: keyof NurseState, val: number) => void;
	onActiveChange: (active: boolean) => void;
	onUpdate?: () => void;
	errors: unknown[];
	index: number;
}) {
	const sum = nurse.morning + nurse.evening + nurse.night + nurse.off;
	const isInvalid = sum !== totalDays;
	const isActive = nurse.active ?? true;

	return (
		<div
			className={cn(
				"animate-slide-up rounded-xl border bg-white p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
				isInvalid ? "border-red-200 bg-red-50/20" : "border-slate-100/80",
				// !isActive && "grayscale/10 opacity-50",
			)}
		>
			<div className="mb-4 flex items-start justify-between gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2">
						<div className="font-bold text-slate-800">{nurse.name}</div>
						<Button
							onClick={() => {
								onActiveChange(!isActive);
							}}
							variant="ghost"
							size={"xs"}
						>
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
					{onUpdate && (
						<Button
							onClick={onUpdate}
							variant="ghost"
							size={"xs"}
							disabled={!isActive}
						>
							<Save className="h-3 w-3" />
							Save
						</Button>
					)}
					<ShiftInput
						label="Day"
						color="bg-[#FDE68A]"
						value={nurse.morning}
						onChange={(v) => onFieldChange("morning", v)}
						max={totalDays}
						disabled={!isActive}
					/>
					<ShiftInput
						label="Eve"
						color="bg-[#BFDBFE]"
						value={nurse.evening}
						onChange={(v) => onFieldChange("evening", v)}
						max={totalDays}
						disabled={!isActive}
					/>
					<ShiftInput
						label="Ngt"
						color="bg-[#C4B5FD]"
						value={nurse.night}
						onChange={(v) => onFieldChange("night", v)}
						max={totalDays}
						disabled={!isActive}
					/>
					<ShiftInput
						label="Off"
						color="bg-[#E5E7EB]"
						value={nurse.off}
						onChange={(v) => onFieldChange("off", v)}
						max={totalDays}
						disabled={!isActive}
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
				disabled={!isActive}
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
