"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import React, { useState } from "react";
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

export default function ShiftAllocationsClient({
	initialData,
}: {
	initialData: unknown;
}) {
	const initialState = normalize(initialData);
	const [state, setState] = useState<NurseState[]>(initialState);
	const [dirtyNurseIds, setDirtyNurseIds] = useState<Set<string>>(new Set());

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

	return (
		<div>
			{dirtyNurseIds.size > 0 && (
				<div className="m-6 flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
					{/* Left status */}
					<div className="flex items-center gap-2 font-medium text-slate-600 text-sm">
						<span className="relative h-2 w-2">
							<span className="absolute h-2 w-2 animate-ping rounded-full bg-red-500 opacity-60" />
							<span className="absolute h-2 w-2 rounded-full bg-red-600" />
						</span>

						<span>You have unsaved changes</span>
					</div>
					{/* Right action */}
					<Button
						onClick={handleSave}
						variant="default"
						disabled={updateMutation.isPending}
					>
						{updateMutation.isPending ? "Saving..." : "Save changes"}
					</Button>
				</div>
			)}

			<div className="m-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
				{state.map((nurse) => (
					<div key={nurse.id} className="rounded-md border p-4">
						<div className="mb-2 font-semibold">{nurse.name}</div>

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
				))}
			</div>
		</div>
	);
}
