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

	const {
		nurseId,
		name: nurseName,
		morning: nurseMorning,
		evening: nurseEvening,
		night: nurseNight,
		active: nurseActive,
	} = nurse;

	// Sync draft when nurse prop changes (different nurse or different base values)
	useEffect(() => {
		// Show `off` as the remaining days after shifts (do not subtract night cooldown
		// from the displayed off count). The night-cooldown value will be shown as an
		// informational badge separately.
		setDraft({
			nurseId,
			name: nurseName,
			morning: nurseMorning,
			evening: nurseEvening,
			night: nurseNight,
			active: nurseActive,
			designation: (nurse as any).designation ?? undefined,
			sortOrder:
				(nurse as any).sortOrder ?? (nurse as any).sort_order ?? undefined,
			off: Math.max(0, totalDays - nurseMorning - nurseEvening - nurseNight),
		});
	}, [
		nurseId,
		nurseName,
		nurseMorning,
		nurseEvening,
		nurseNight,
		nurseActive,
		totalDays,
	]);

	// Computed values
	// Night cooldown: every 2 consecutive nights needs 1 off day (informational)
	const nightCooldownOff = Math.floor(draft.night / 2);
	// Do not include nightCooldownOff in the canonical sum — `off` already shows
	// the visible off-days count. Sum should equal totalDays.
	const sum = draft.morning + draft.evening + draft.night + draft.off;
	const isInvalid = sum !== totalDays;
	const hasChanged = nurseHasChanged(nurse, draft);

	// Preference update mutation with optimistic updates
	const updatePrefsMutation = useUpdatePreferences({
		onSuccess: () => {
			onShiftChange?.(draft.morning, draft.evening, draft.night);
		},
	});

	// Active toggle mutation with optimistic updates
	// skipInvalidate: true — we already optimistically update the UI and sync nurseRows
	// via onActiveChange. Invalidating the schedule query causes a full refetch that
	// triggers unnecessary re-renders and scroll-to-top.
	const updateActiveMutation = useUpdateNurseActive({
		skipInvalidate: true,
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
					// Recompute off as remaining days after assigned shifts (do not subtract
					// nightCooldownOff here so the displayed off count matches user expectation).
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

	// Cancel handler - resets draft to original nurse values
	const handleCancel = useCallback(() => {
		setDraft({
			nurseId,
			name: nurseName,
			morning: nurseMorning,
			evening: nurseEvening,
			night: nurseNight,
			active: nurseActive,
			designation: (nurse as any).designation ?? undefined,
			sortOrder:
				(nurse as any).sortOrder ?? (nurse as any).sort_order ?? undefined,
			off: Math.max(0, totalDays - nurseMorning - nurseEvening - nurseNight),
		});
	}, [
		nurseId,
		nurseName,
		nurseMorning,
		nurseEvening,
		nurseNight,
		nurseActive,
		totalDays,
	]);

	// Toggle active handler with optimistic update
	const handleToggleActive = useCallback(() => {
		if (updateActiveMutation.isPending) return;

		const nextActive = !draft.active;

		// Optimistic update - update local state immediately
		setDraft((prev) => ({ ...prev, active: nextActive }));
		onActiveChange?.(nextActive);

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
					onActiveChange?.(!nextActive);
				},
			},
		);
	}, [draft.nurseId, draft.active, updateActiveMutation, onActiveChange]);

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
