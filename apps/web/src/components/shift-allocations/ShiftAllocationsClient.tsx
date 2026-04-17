"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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

function normalize(data: unknown): NurseState[] {
	if (!data || !Array.isArray(data)) return [];

	return data.map((item: NurseData) => {
		const total = item.morning + item.evening + item.night;

		return {
			id: item.nurseId,
			name: item.name,
			morning: item.morning,
			evening: item.evening,
			night: item.night,
			off: Math.max(0, 100 - total),
		};
	});
}

/* ---------------- MONTH HELPERS ---------------- */

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

function computeMonthlyShifts(nurse: NurseState, days: number) {
	const m = Math.ceil((nurse.morning / 100) * days);
	const e = Math.ceil((nurse.evening / 100) * days);
	const n = Math.ceil((nurse.night / 100) * days);

	const used = m + e + n;
	const off = Math.max(0, days - used);

	return {
		morning: m,
		evening: e,
		night: n,
		off,
	};
}

/* ---------------- MAIN COMPONENT ---------------- */

export default function ShiftAllocationsClient({
	initialData,
}: {
	initialData: unknown;
}) {
	const initialState = normalize(initialData);
	const [state, setState] = useState<NurseState[]>(initialState);
	const [dirtyNurseIds, setDirtyNurseIds] = useState<Set<string>>(new Set());
	const [month, setMonth] = useState(() => new Date());

	const updateMutation = useMutation({
		mutationFn: async (
			preferences: { nurseId: string; shiftId: string; weight: number }[],
		) => trpcClient.roster.updateNurseShiftPreferences.mutate(preferences),
		onSuccess: () => {
			toast.success("Preferences saved successfully");
			setDirtyNurseIds(new Set());
		},
		onError: (error: Error) => {
			toast.error(`Failed to save: ${error.message}`);
		},
	});

	function updateNurse(id: string, next: Partial<NurseState>) {
		setState((prev) => prev.map((n) => (n.id === id ? { ...n, ...next } : n)));
		setDirtyNurseIds((prev) => new Set([...prev, id]));
	}

	function handleSave() {
		const preferences = state
			.filter((nurse) => dirtyNurseIds.has(nurse.id))
			.flatMap((nurse) => [
				{ nurseId: nurse.id, shiftId: "shift_morning", weight: nurse.morning },
				{ nurseId: nurse.id, shiftId: "shift_evening", weight: nurse.evening },
				{ nurseId: nurse.id, shiftId: "shift_night", weight: nurse.night },
			]);

		updateMutation.mutate(preferences);
	}

	const days = getDaysInMonth(month);

	return (
		<div>
			{/* UNSAVED CHANGES BAR */}
			{dirtyNurseIds.size > 0 && (
				<div className="m-6 flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
					<div className="flex items-center gap-2 font-medium text-slate-600 text-sm">
						<span className="relative h-2 w-2">
							<span className="absolute h-2 w-2 animate-ping rounded-full bg-red-500 opacity-60" />
							<span className="absolute h-2 w-2 rounded-full bg-red-600" />
						</span>

						<span>You have unsaved changes</span>
					</div>

					<Button
						onClick={handleSave}
						variant="default"
						disabled={updateMutation.isPending}
					>
						{updateMutation.isPending ? "Saving..." : "Save changes"}
					</Button>
				</div>
			)}

			{/* MONTH NAVIGATION */}
			<div className="m-6 flex items-center justify-between rounded-md border bg-white p-3">
				<button
					type="button"
					onClick={() => setMonth((m) => addMonths(m, -1))}
					className="rounded bg-slate-100 px-1.5 py-1"
				>
					<ArrowLeft />
				</button>

				<div className="font-semibold">{formatMonth(month)}</div>

				<button
					type="button"
					onClick={() => setMonth((m) => addMonths(m, 1))}
					className="rounded bg-slate-100 px-1.5 py-1"
				>
					<ArrowRight />
				</button>
			</div>

			{/* NURSE GRID */}
			<div className="m-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
				{state.map((nurse) => {
					const shifts = computeMonthlyShifts(nurse, days);

					return (
						<div key={nurse.id} className="rounded-md border p-4">
							<div className="flex items-center justify-between gap-2">
								<div className="mb-2 font-semibold">{nurse.name}</div>

								{/* MONTHLY SHIFT SUMMARY */}
								<div className="mb-2 flex flex-wrap items-center gap-3 text-slate-600 text-sm">
									<span className="flex items-center gap-1">
										<span className="h-2.5 w-2.5 rounded-full bg-[#7dcfaa]" />
										Total: {shifts.morning + shifts.evening + shifts.night}
									</span>

									<span className="flex items-center gap-1">
										<span className="h-2.5 w-2.5 rounded-full bg-[#FDE68A]" />
										<input
											type="number"
											min={0}
											value={shifts.morning}
											className="h-8 w-12 rounded border px-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
											onChange={(e) => {
												const val = Math.max(
													0,
													Number.parseInt(e.target.value, 10) || 0,
												);
												updateNurse(nurse.id, {
													morning: Math.round((val / days) * 100),
												});
											}}
										/>
									</span>

									<span className="flex items-center gap-1">
										<span className="h-2.5 w-2.5 rounded-full bg-[#BFDBFE]" />
										<input
											type="number"
											min={0}
											value={shifts.evening}
											className="h-8 w-12 rounded border px-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
											onChange={(e) => {
												const val = Math.max(
													0,
													Number.parseInt(e.target.value, 10) || 0,
												);
												updateNurse(nurse.id, {
													evening: Math.round((val / days) * 100),
												});
											}}
										/>
									</span>

									<span className="flex items-center gap-1">
										<span className="h-2.5 w-2.5 rounded-full bg-[#C4B5FD]" />
										<input
											type="number"
											min={0}
											value={shifts.night}
											className="h-8 w-12 rounded border px-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
											onChange={(e) => {
												const val = Math.max(
													0,
													Number.parseInt(e.target.value, 10) || 0,
												);
												updateNurse(nurse.id, {
													night: Math.round((val / days) * 100),
												});
											}}
										/>
									</span>

									<span className="flex items-center gap-1">
										<span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
										Off: {shifts.off}
									</span>
								</div>
							</div>

							{/* SLIDER */}
							<FourWaySlider
								value={{
									morning: nurse.morning,
									evening: nurse.evening,
									night: nurse.night,
									off: nurse.off,
								}}
								onChange={(v) => updateNurse(nurse.id, v)}
							/>
						</div>
					);
				})}
			</div>
		</div>
	);
}
