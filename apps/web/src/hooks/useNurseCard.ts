"use client";

import { useState } from "react";
import type { NurseState } from "../components/shift-allocations/types";
import {
	convertToPreferences,
	useUpdateNurseActive,
	useUpdatePreferences,
} from "./useUpdatePreferences";

interface UseNurseCardProps {
	nurse: NurseState;
	totalDays: number;
	original?: NurseState;
}

export function useNurseCard({
	nurse,
	totalDays,
	original,
}: UseNurseCardProps) {
	const [state, setState] = useState<NurseState>(nurse);
	const [isSaving, setIsSaving] = useState(false);
	const [isUpdatingActive, setIsUpdatingActive] = useState(false);

	const updatePrefsMutation = useUpdatePreferences();
	const updateActiveMutation = useUpdateNurseActive();

	const sum = state.morning + state.evening + state.night + state.off;
	const isInvalid = sum !== totalDays;
	const isActive = state.active ?? true;
	const hasChanged =
		original &&
		(original.morning !== state.morning ||
			original.evening !== state.evening ||
			original.night !== state.night ||
			original.off !== state.off ||
			original.active !== state.active);

	const handleFieldChange = (field: keyof NurseState, val: number) => {
		setState((prev) => {
			const updated = { ...prev, [field]: val };
			if (field !== "off") {
				updated.off = Math.max(
					0,
					totalDays - updated.morning - updated.evening - updated.night,
				);
			}
			return updated;
		});
	};

	const off = state.off;

	const handleUpdate = async () => {
		const preferences = convertToPreferences(
			{
				id: state.nurseId,
				morning: state.morning,
				evening: state.evening,
				night: state.night,
				active: state.active,
			},
			totalDays,
		);
		setIsSaving(true);
		await updatePrefsMutation.mutateAsync({
			preferences,
			daysInMonth: totalDays,
		});
		setIsSaving(false);
	};

	const handleActiveUpdate = async (active: boolean) => {
		setIsUpdatingActive(true);
		await updateActiveMutation.mutateAsync({
			nurseId: state.nurseId,
			active,
			morning: state.morning,
			evening: state.evening,
			night: state.night,
			totalDays,
		});
		setIsUpdatingActive(false);
	};

	return {
		state,
		isSaving,
		isUpdatingActive,
		isInvalid,
		isActive,
		hasChanged,
		sum,
		off,
		handleFieldChange,
		handleUpdate,
		handleActiveUpdate,
	};
}
