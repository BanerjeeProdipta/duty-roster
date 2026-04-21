"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import z from "zod";
import type { NurseData, NurseState } from "./types";
import {
	convertToPreferences,
	useUpdatePreferences,
} from "./useUpdatePreferences";
import { normalize } from "./utils";

interface UseShiftAllocationsFormProps {
	initialData: NurseData[];
	totalDays: number;
	filteredData: NurseData[];
}

const createNurseSchema = (days: number) =>
	z.object({
		nurseId: z.string(),
		name: z.string(),
		morning: z.number().min(0).max(days),
		evening: z.number().min(0).max(days),
		night: z.number().min(0).max(days),
		off: z.number().min(0).max(days),
		active: z.boolean(),
	});

export function useShiftAllocationsForm({
	initialData,
	totalDays,
	filteredData,
}: UseShiftAllocationsFormProps) {
	const [isSaving, setIsSaving] = useState(false);

	const updateMutation = useUpdatePreferences();

	const form = useForm({
		defaultValues: {
			nurses: normalize(initialData, totalDays),
		},
		onSubmit: async ({ value }) => {
			const preferences = value.nurses.flatMap((nurse) =>
				convertToPreferences(
					{
						id: nurse.nurseId,
						morning: nurse.morning,
						evening: nurse.evening,
						night: nurse.night,
						active: nurse.active,
					},
					totalDays,
				),
			);

			setIsSaving(true);
			await updateMutation.mutateAsync({ preferences, daysInMonth: totalDays });
		},
		validators: {
			onChange: z.object({
				nurses: z.array(createNurseSchema(totalDays)),
			}),
		},
	});

	useEffect(() => {
		if (!isSaving) {
			form.reset({
				nurses: normalize(filteredData, totalDays),
			});
		}
	}, [totalDays, filteredData, form, isSaving]);

	return {
		form,
		updateMutation,
		isSaving,
	};
}

export type { NurseState };
