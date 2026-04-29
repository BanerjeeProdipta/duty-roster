"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
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

interface UseNurseCardReturn {
	// State
	draft: NurseState;
	sum: number;
	isInvalid: boolean;
	hasChanged: boolean;

	// Mutation states
	isSavingPending: boolean;
	isSavingError: boolean;
	isToggleActivePending: boolean;
	isToggleActiveError: boolean;

	// Handlers
	handleFieldChange: (field: ShiftField, value: number) => void;
	handleSave: () => void;
	handleToggleActive: () => void;
}

export function useNurseCard({
	nurse,
	totalDays,
}: UseNurseCardOptions): UseNurseCardReturn {
	const _queryClient = useQueryClient();

	// Local draft state - initialized from prop, updated optimistically
	const [draft, setDraft] = useState<NurseState>(nurse);

	// Sync draft when nurse prop changes (different nurse or different base values)
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

	// Computed values
	const sum = draft.morning + draft.evening + draft.night + draft.off;
	const isInvalid = sum !== totalDays;
	const hasChanged = nurseHasChanged(nurse, draft);

	// Preference update mutation with optimistic updates
	const updatePrefsMutation = useUpdatePreferences({
		onSuccess: () => {
			// Query invalidation is handled by useUpdatePreferences
			// Optimistic update already applied via setDraft
		},
	});

	// Active toggle mutation with optimistic updates
	const updateActiveMutation = useUpdateNurseActive({
		onSuccess: () => {
			// Query invalidation is handled by useUpdateNurseActive
		},
	});

	// Field change handler with automatic off calculation
	const handleFieldChange = useCallback(
		(field: ShiftField, value: number) => {
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
		},
		[totalDays],
	);

	// Save handler - uses mutation's pending state
	const handleSave = useCallback(() => {
		if (updatePrefsMutation.isPending) return;

		const preferences = convertToPreferences(draft, totalDays);
		updatePrefsMutation.mutate({
			preferences,
			daysInMonth: totalDays,
		});
	}, [draft, totalDays, updatePrefsMutation]);

	// Toggle active handler with optimistic update
	const handleToggleActive = useCallback(() => {
		if (updateActiveMutation.isPending) return;

		const nextActive = !draft.active;

		// Optimistic update - update local state immediately
		setDraft((prev) => ({ ...prev, active: nextActive }));

		// Mutate to server
		updateActiveMutation.mutate(
			{
				nurseId: draft.nurseId,
				active: nextActive,
				morning: draft.morning,
				evening: draft.evening,
				night: draft.night,
				totalDays,
			},
			{
				// Rollback on error
				onError: () => {
					setDraft((prev) => ({ ...prev, active: !nextActive }));
				},
			},
		);
	}, [draft, totalDays, updateActiveMutation]);

	return {
		// State
		draft,
		sum,
		isInvalid,
		hasChanged,

		// Mutation states (replacing manual isSaving/isUpdatingActive)
		isSavingPending: updatePrefsMutation.isPending,
		isSavingError: updatePrefsMutation.isError,
		isToggleActivePending: updateActiveMutation.isPending,
		isToggleActiveError: updateActiveMutation.isError,

		// Handlers
		handleFieldChange,
		handleSave,
		handleToggleActive,
	};
}
