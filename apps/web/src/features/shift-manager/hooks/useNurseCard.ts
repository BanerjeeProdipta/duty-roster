import { useEffect, useState } from "react";
import {
	useUpdateNurseActive,
	useUpdatePreferences,
} from "@/hooks/useUpdatePreferences";
import type { NurseState, ShiftField } from "../types";
import { convertToPreferences, nurseHasChanged } from "../utils";

interface UseNurseCardOptions {
	nurse: NurseState;
	totalDays: number;
}

export function useNurseCard({ nurse, totalDays }: UseNurseCardOptions) {
	// Each card owns its own draft state, initialised from the prop.
	// This means editing one card never touches another card's state.
	const [draft, setDraft] = useState<NurseState>(nurse);
	const [isSaving, setIsSaving] = useState(false);
	const [isUpdatingActive, setIsUpdatingActive] = useState(false);

	useEffect(() => {
		setDraft({
			...nurse,
			off: Math.max(0, totalDays - nurse.morning - nurse.evening - nurse.night),
		});
	}, [
		nurse.nurseId,
		nurse.name,
		nurse.morning,
		nurse.evening,
		nurse.night,
		nurse.active,
		totalDays,
		nurse,
	]);

	const updatePrefsMutation = useUpdatePreferences();
	const updateActiveMutation = useUpdateNurseActive();

	const sum = draft.morning + draft.evening + draft.night + draft.off;
	const isInvalid = sum !== totalDays;
	// hasChanged compares against the original prop, not a shared parent map.
	const hasChanged = nurseHasChanged(nurse, draft);

	function handleFieldChange(field: ShiftField, value: number) {
		setDraft((prev) => {
			const next = { ...prev, [field]: value };
			if (field !== "off") {
				next.off = Math.max(
					0,
					totalDays - next.morning - next.evening - next.night,
				);
			}
			return next;
		});
	}

	async function handleSave() {
		if (isSaving) return;
		setIsSaving(true);
		try {
			const preferences = convertToPreferences(draft, totalDays);
			await updatePrefsMutation.mutateAsync({
				preferences,
				daysInMonth: totalDays,
			});
		} finally {
			setIsSaving(false);
		}
	}

	async function handleToggleActive() {
		if (isUpdatingActive) return;
		const nextActive = !draft.active;
		setIsUpdatingActive(true);
		try {
			await updateActiveMutation.mutateAsync({
				nurseId: draft.nurseId,
				active: nextActive,
				morning: draft.morning,
				evening: draft.evening,
				night: draft.night,
				totalDays,
			});
			setDraft((prev) => ({ ...prev, active: nextActive }));
		} finally {
			setIsUpdatingActive(false);
		}
	}

	return {
		draft,
		sum,
		isInvalid,
		hasChanged,
		isSaving,
		isUpdatingActive,
		handleFieldChange,
		handleSave,
		handleToggleActive,
	};
}
