import { Button } from "@Duty-Roster/ui/components/button";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { AlertCircle, Ban, Loader2, Save, User } from "lucide-react";
import { ShiftInput } from "./ShiftInput";
import { FourWaySlider } from "./Slider";
import type { NurseState } from "./types";

export function NurseCard({
	nurse,
	totalDays,
	onFieldChange,
	onActiveChange,
	onUpdate,
	onActiveUpdate,
	original,
	isActiveLoading,
	highlight,
}: {
	nurse: NurseState;
	totalDays: number;
	onFieldChange: (field: keyof NurseState, val: number) => void;
	onActiveChange: (active: boolean) => void;
	onUpdate?: () => void | Promise<void>;
	onActiveUpdate?: (active: boolean) => void | Promise<void>;
	errors: unknown[];
	index: number;
	original?: NurseState;
	isActiveLoading?: boolean;
	highlight?: boolean;
}) {
	const sum = nurse.morning + nurse.evening + nurse.night + nurse.off;
	const isInvalid = sum !== totalDays;
	const isActive = nurse.active ?? true;
	const hasChanged =
		original &&
		(original.morning !== nurse.morning ||
			original.evening !== nurse.evening ||
			original.night !== nurse.night ||
			original.off !== nurse.off ||
			original.active !== nurse.active);

	return (
		<div
			className={cn(
				"animate-slide-up rounded-xl border bg-white p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
				isInvalid ? "border-red-200 bg-red-50/20" : "border-slate-100/80",
				highlight && "ring-2 ring-yellow-400",
				// !isActive && "grayscale/10 opacity-50",
			)}
		>
			<div className="mb-4 flex items-start justify-between gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2">
						<div className="w-28 font-bold text-slate-800">{nurse.name}</div>
						<Button
							onClick={() => {
								if (onActiveUpdate) {
									onActiveUpdate(!isActive);
								} else {
									onActiveChange(!isActive);
								}
							}}
							variant="ghost"
							size={"xs"}
							disabled={isActiveLoading}
						>
							{isActiveLoading && (
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
					{onUpdate && hasChanged && (
						<Button
							onClick={onUpdate}
							variant="ghost"
							size={"xs"}
							disabled={!isActive}
							className="bg-lime-100 text-lime-700 transition duration-300 hover:bg-lime-200"
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
				<p className="mt-2 flex items-center gap-1 font-medium text-red-500 text-xs">
					<AlertCircle className="h-3 w-3" />
					Shift allocation must sum exactly to {totalDays} days.
				</p>
			)}
		</div>
	);
}
