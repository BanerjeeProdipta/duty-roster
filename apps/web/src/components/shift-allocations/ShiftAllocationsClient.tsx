"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { trpcClient } from "@/utils/trpc";
import { FourWaySlider } from "./Slider";

type NurseData = {
	nurseId: string;
	name: string;
	morning: number;
	evening: number;
	night: number;
};

type NurseState = {
	id: string;
	name: string;
	morning: number;
	evening: number;
	night: number;
	off: number;
};

function normalize(data: unknown, totalDays: number): NurseState[] {
	if (!data || !Array.isArray(data)) return [];

	return data.map((item: NurseData) => {
		const m = Math.round((item.morning / 100) * totalDays);
		const e = Math.round((item.evening / 100) * totalDays);
		const n = Math.round((item.night / 100) * totalDays);
		const used = m + e + n;

		return {
			id: item.nurseId,
			name: item.name,
			morning: m,
			evening: e,
			night: n,
			off: Math.max(0, totalDays - used),
		};
	});
}

function addMonths(date: Date, delta: number) {
	const d = new Date(date);
	d.setMonth(d.getMonth() + delta);
	return d;
}

function formatMonth(date: Date) {
	return date.toLocaleString("default", {
		month: "long",
		year: "numeric",
	});
}

function getDaysInMonth(date: Date) {
	return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

import { useRouter } from "next/navigation";

export default function ShiftAllocationsClient({
	initialData,
}: {
	initialData: unknown;
}) {
	const router = useRouter();
	const [month, setMonth] = useState(() => new Date());
	const totalDays = getDaysInMonth(month);

	const nurseSchema = z
		.object({
			id: z.string(),
			name: z.string(),
			morning: z.number().min(0),
			evening: z.number().min(0),
			night: z.number().min(0),
			off: z.number().min(0),
		})
		.refine(
			(data) =>
				data.morning + data.evening + data.night + data.off === totalDays,
			{
				message: `Total must be exactly ${totalDays} days`,
				path: ["off"],
			},
		);

	const [isSaving, setIsSaving] = useState(false);

	const updateMutation = useMutation({
		mutationFn: async (
			preferences: { nurseId: string; shiftId: string; weight: number }[],
		) => trpcClient.roster.updateNurseShiftPreferences.mutate(preferences),
		onMutate: () => {
			setIsSaving(true);
		},
		onSuccess: () => {
			toast.success("Preferences saved successfully");
			router.refresh();
			// Clear the dirty flag by resetting to current values
			form.reset({ nurses: form.state.values.nurses });
			// Keep isSaving true until next initialData sync to bridge the refresh gap
		},
		onSettled: () => {
			// We don't set isSaving(false) here because we want to wait for
			// the server's initialData to actually update to avoid the flicker
		},
		onError: (error: Error) => {
			setIsSaving(false);
			toast.error(`Failed to save: ${error.message}`);
		},
	});

	const form = useForm({
		defaultValues: {
			nurses: normalize(initialData, totalDays),
		},
		onSubmit: async ({ value }) => {
			const preferences = value.nurses.flatMap((nurse) => [
				{
					nurseId: nurse.id,
					shiftId: "shift_morning",
					weight: Math.round((nurse.morning / totalDays) * 100),
				},
				{
					nurseId: nurse.id,
					shiftId: "shift_evening",
					weight: Math.round((nurse.evening / totalDays) * 100),
				},
				{
					nurseId: nurse.id,
					shiftId: "shift_night",
					weight: Math.round((nurse.night / totalDays) * 100),
				},
			]);
			await updateMutation.mutateAsync(preferences);
		},
		validators: {
			onChange: z.object({
				nurses: z.array(nurseSchema),
			}),
		},
	});

	// Sync form when totalDays changes (due to month change) OR initialData refresh
	useEffect(() => {
		// Only perform the reset if we aren't currently waiting for a refresh
		// to complete, to prevent the "snap back to old data" flicker.
		if (!isSaving) {
			form.reset({
				nurses: normalize(initialData, totalDays),
			});
		} else {
			// If we were saving, we stop the "optimistic" mode once the
			// server data finally matches what we sent.
			setIsSaving(false);
		}
	}, [totalDays, initialData, form]);

	return (
		<div className="flex flex-col gap-6">
			{/* HEADER & NAV */}
			<div className="flex items-center justify-between rounded-md border bg-white p-3">
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => setMonth((m) => addMonths(m, -1))}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>

				<div className="font-semibold">{formatMonth(month)}</div>

				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => setMonth((m) => addMonths(m, 1))}
				>
					<ArrowRight className="h-4 w-4" />
				</Button>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="flex flex-col gap-6"
			>
				{/* ACTION BAR */}
				<form.Subscribe
					selector={(state) => ({
						canSubmit: state.canSubmit,
						isSubmitting: state.isSubmitting,
						isDirty: state.isDirty,
					})}
				>
					{({ canSubmit, isSubmitting, isDirty }) =>
						isDirty && (
							<div className="fade-in slide-in-from-top-2 flex animate-in items-center justify-between rounded-md border border-amber-100 bg-amber-50 p-4 shadow-sm">
								<div className="flex items-center gap-2 font-medium text-amber-800 text-sm">
									<AlertCircle className="h-4 w-4" />
									<span>
										You have unsaved changes. Total shifts must sum to{" "}
										{totalDays} days.
									</span>
								</div>

								<Button type="submit" disabled={!canSubmit || isSubmitting}>
									{isSubmitting ? "Saving..." : "Save All Changes"}
								</Button>
							</div>
						)
					}
				</form.Subscribe>

				{/* NURSE GRID */}
				<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
					<form.Subscribe selector={(state) => state.values.nurses}>
						{(nurses) => (
							<>
								{nurses.map((nurse, i) => (
									<NurseCard
										key={nurse.id}
										nurse={nurse}
										totalDays={totalDays}
										onFieldChange={(subField, val) => {
											form.setFieldValue(
												`nurses[${i}].${subField}` as any,
												val,
											);
										}}
										index={i}
									/>
								))}
							</>
						)}
					</form.Subscribe>
				</div>
			</form>
		</div>
	);
}

function NurseCard({
	nurse,
	totalDays,
	onFieldChange,
	_errors,
	_index,
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
			key={nurse.id}
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

				{/* INPUTS */}
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

			{/* SLIDER */}
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

function ShiftInput({
	label,
	color,
	value,
	onChange,
	max,
}: {
	label: string;
	color: string;
	value: number;
	onChange: (v: number) => void;
	max: number;
}) {
	const [localValue, setLocalValue] = useState(value.toString());

	// Update local value if prop changes (e.g. from slider)
	useEffect(() => {
		setLocalValue(value.toString());
	}, [value]);

	return (
		<div className="flex flex-col items-center">
			<div className="flex items-center gap-1">
				<div className={cn("h-2 w-2 rounded-full", color)} title={label} />
				<input
					type="number"
					min={0}
					max={max}
					value={localValue}
					className="h-8 w-10 rounded border border-slate-200 bg-slate-50/50 text-center font-bold text-sm [appearance:textfield] focus:border-primary focus:ring-1 focus:ring-primary/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					onChange={(e) => {
						const valStr = e.target.value;
						setLocalValue(valStr);
						const valNum = Number.parseInt(valStr, 10);
						if (!Number.isNaN(valNum)) {
							onChange(Math.max(0, valNum));
						} else if (valStr === "") {
							onChange(0);
						}
					}}
					onBlur={() => {
						// No-op: let the parent useEffect handle sync to avoid stale prop issues
					}}
				/>
			</div>
			<span className="mt-1 font-bold text-[8px] text-slate-400 uppercase">
				{label}
			</span>
		</div>
	);
}
