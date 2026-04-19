"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { trpcClient } from "@/utils/trpc";
import { NurseCard } from "./NurseCard";
import type { NurseData } from "./types";
import { addMonths, formatMonth, getDaysInMonth, normalize } from "./utils";

export default function ShiftAllocationsClient({
	initialData,
}: {
	initialData: NurseData[];
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
			active: z.boolean(),
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
			preferences: {
				nurseId: string;
				shiftId: string;
				weight: number;
				active: boolean;
			}[],
		) => trpcClient.roster.updateNurseShiftPreferences.mutate(preferences),
		onMutate: () => {
			setIsSaving(true);
		},
		onSuccess: () => {
			toast.success("Preferences saved successfully");
			router.refresh();
			form.reset({ nurses: form.state.values.nurses });
		},
		onSettled: () => {
			setIsSaving(false);
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
					active: nurse.active,
				},
				{
					nurseId: nurse.id,
					shiftId: "shift_evening",
					weight: Math.round((nurse.evening / totalDays) * 100),
					active: nurse.active,
				},
				{
					nurseId: nurse.id,
					shiftId: "shift_night",
					weight: Math.round((nurse.night / totalDays) * 100),
					active: nurse.active,
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

	useEffect(() => {
		if (!isSaving) {
			form.reset({
				nurses: normalize(initialData, totalDays),
			});
		}
	}, [totalDays, initialData, form, isSaving]);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between rounded-md border bg-white p-3">
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => setMonth((m) => addMonths(m, -1))}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>

				<div className="flex flex-col items-center gap-1">
					<div className="font-semibold">{formatMonth(month)}</div>
					<form.Subscribe selector={(state) => state.values.nurses}>
						{(nurses) => {
							const activeCount = nurses.filter((n) => n.active).length;
							const inactiveCount = nurses.length - activeCount;
							return (
								<div className="flex gap-2 text-xs">
									<span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
										{nurses.length} total
									</span>
									<span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-green-700">
										{activeCount} active
									</span>
									<span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
										{inactiveCount} inactive
									</span>
								</div>
							);
						}}
					</form.Subscribe>
				</div>

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
									<span>You have unsaved changes.</span>
								</div>

								<Button type="submit" disabled={!canSubmit || isSubmitting}>
									{isSubmitting ? "Saving..." : "Save All Changes"}
								</Button>
							</div>
						)
					}
				</form.Subscribe>

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
												`nurses[${i}].${subField}` as "nurses[0].morning",
												val,
											);
										}}
										onActiveChange={(active) => {
											form.setFieldValue(`nurses[${i}].active`, active);
										}}
										errors={[]}
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
