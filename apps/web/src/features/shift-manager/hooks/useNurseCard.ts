"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
	useUpdateNurse,
	useUpdateNurseActive,
	useUpdatePreferences,
} from "@/hooks/useUpdatePreferences";
import type { NurseState, ShiftField } from "../types";
import { convertToPreferences, nurseHasChanged } from "../utils";

interface UseNurseCardOptions {
	nurse: NurseState;
	totalDays: number;
	onShiftChange?: (morning: number, evening: number, night: number) => void;
	onActiveChange?: (active: boolean) => void;
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
	isUpdateNamePending: boolean;

	// Handlers
	handleFieldChange: (field: ShiftField, value: number) => void;
	handleSave: () => void;
	handleCancel: () => void;
	handleToggleActive: () => void;
	handleUpdateName: (name: string) => void;
}

export function useNurseCard({
	nurse,
	totalDays,
	onShiftChange,
	onActiveChange,
}: UseNurseCardOptions): UseNurseCardReturn {
	const _queryClient = useQueryClient();

	// Local draft state - initialized from prop, updated optimistically
	const [draft, setDraft] = useState<NurseState>(nurse);

	// Sync draft when nurse prop changes (different nurse or different base values)
	useEffect(() => {
		const nightCooldownOff = Math.floor(nurse.night / 2);
		setDraft({
			...nurse,
			off: Math.max(
				0,
				totalDays -
					nurse.morning -
					nurse.evening -
					nurse.night -
					nightCooldownOff,
			),
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
	// Night cooldown: every 2 consecutive nights needs 1 off day
	const nightCooldownOff = Math.floor(draft.night / 2);
	const sum =
		draft.morning + draft.evening + draft.night + draft.off + nightCooldownOff;
	const isInvalid = sum !== totalDays;
	const hasChanged = nurseHasChanged(nurse, draft);

	// Preference update mutation with optimistic updates
	const updatePrefsMutation = useUpdatePreferences({
		onSuccess: () => {
			onShiftChange?.(draft.morning, draft.evening, draft.night);
		},
	});

	// Active toggle mutation with optimistic updates
	const updateActiveMutation = useUpdateNurseActive({
		onSuccess: () => {
			onActiveChange?.(draft.active);
		},
	});

	// Nurse update mutation (for name updates)
	const updateNurseMutation = useUpdateNurse({
		onSuccess: () => {
			// Query invalidation is handled by useUpdateNurse
		},
	});

	// Field change handler with automatic off calculation (includes night cooldown)
	const handleFieldChange = useCallback(
		(field: ShiftField, value: number) => {
			setDraft((prev) => {
				const next = { ...prev, [field]: value };
				if (field !== "off") {
					// Night cooldown: every 2 consecutive nights needs 1 off day
					const nightCooldownOff = Math.floor(next.night / 2);
					next.off = Math.max(
						0,
						totalDays -
							next.morning -
							next.evening -
							next.night -
							nightCooldownOff,
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

	// Cancel handler - resets draft to original nurse values
	const handleCancel = useCallback(() => {
		const nightCooldownOff = Math.floor(nurse.night / 2);
		setDraft({
			...nurse,
			off: Math.max(
				0,
				totalDays -
					nurse.morning -
					nurse.evening -
					nurse.night -
					nightCooldownOff,
			),
		});
	}, [nurse, totalDays]);

	// Toggle active handler with optimistic update
	const handleToggleActive = useCallback(() => {
		if (updateActiveMutation.isPending) return;

		const nextActive = !draft.active;
		console.log("🔄 Toggling active:", {
			nurseId: draft.nurseId,
			from: draft.active,
			to: nextActive,
		});

		// Optimistic update - update local state immediately
		setDraft((prev) => ({ ...prev, active: nextActive }));

		// Mutate to server
		updateActiveMutation.mutate(
			{
				nurseId: draft.nurseId,
				active: nextActive,
			},
			{
				// Rollback on error
				onError: () => {
					setDraft((prev) => ({ ...prev, active: !nextActive }));
				},
			},
		);
	}, [draft.nurseId, draft.active, updateActiveMutation]);

	// Update name handler
	const handleUpdateName = useCallback(
		(name: string) => {
			if (updateNurseMutation.isPending) return;

			const previousName = draft.name;

			// Optimistic update
			setDraft((prev) => ({ ...prev, name }));

			updateNurseMutation.mutate(
				{
					nurseId: draft.nurseId,
					name,
				},
				{
					onError: () => {
						// Rollback on error
						setDraft((prev) => ({ ...prev, name: previousName }));
					},
				},
			);
		},
		[draft.nurseId, draft.name, updateNurseMutation],
	);

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
		isUpdateNamePending: updateNurseMutation.isPending,

		// Handlers
		handleFieldChange,
		handleSave,
		handleCancel,
		handleToggleActive,
		handleUpdateName,
	};
}
