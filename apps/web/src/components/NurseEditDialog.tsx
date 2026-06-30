"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@Duty-Roster/ui/components/dialog";
import { Input } from "@Duty-Roster/ui/components/input";
import { Label } from "@Duty-Roster/ui/components/label";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Coffee, Moon, Pencil, Sun, Sunset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { NurseState } from "@/features/shift-manager/types";
import { trpcClient } from "@/utils/trpc";

type NurseEditForm = {
	name?: string;
	designation?: string;
	morning: number;
	evening: number;
	night: number;
	off: number;
};

interface NurseEditDialogProps {
	nurses: NurseState[];
	totalDays: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave?: (
		nurseId: string,
		morning: number,
		evening: number,
		night: number,
	) => void;
}

export function NurseEditDialog({
	nurses,
	totalDays,
	open,
	onOpenChange,
	onSave,
}: NurseEditDialogProps) {
	const isBulk = nurses.length > 1;
	const first = nurses[0];
	const queryClient = useQueryClient();
	const [editingFields, setEditingFields] = useState<Set<string>>(
		() => new Set(),
	);

	useEffect(() => {
		if (!open) setEditingFields(new Set());
	}, [open]);

	function toggleEdit(field: string) {
		setEditingFields((prev) => {
			const next = new Set(prev);
			if (next.has(field)) next.delete(field);
			else next.add(field);
			return next;
		});
	}

	const editSchema = useMemo(
		() =>
			z
				.object({
					name: z.string().optional(),
					designation: z.string().optional(),
					morning: z.number().int().min(0).max(totalDays),
					evening: z.number().int().min(0).max(totalDays),
					night: z.number().int().min(0).max(totalDays),
					off: z.number().int().min(0).max(totalDays),
				})
				.refine((d) => d.morning + d.evening + d.night <= totalDays, {
					message: `Total must not exceed ${totalDays}`,
					path: ["night"],
				}),
		[totalDays],
	);

	const {
		register,
		handleSubmit,
		formState: { errors, isValid },
		reset,
		control,
	} = useForm<NurseEditForm>({
		resolver: zodResolver(editSchema),
		mode: "onChange",
		defaultValues: {
			name: first?.name ?? "",
			designation: first?.designation ?? "",
			morning: first?.morning ?? 0,
			evening: first?.evening ?? 0,
			night: first?.night ?? 0,
			off: first
				? Math.max(0, totalDays - first.morning - first.evening - first.night)
				: 0,
		},
	});

	const prevOpenRef = useMemo(() => ({ current: false }), []);
	useEffect(() => {
		if (open && !prevOpenRef.current && first) {
			reset({
				name: first.name,
				designation: first.designation ?? "",
				morning: first.morning,
				evening: first.evening,
				night: first.night,
				off: Math.max(
					0,
					totalDays - first.morning - first.evening - first.night,
				),
			});
		}
		prevOpenRef.current = open;
	}, [open, totalDays, reset]); // eslint-disable-line react-hooks/exhaustive-deps

	const { mutate, isPending } = useMutation({
		mutationKey: ["nurse-edit", isBulk ? "bulk" : first?.nurseId],
		mutationFn: async (data: NurseEditForm) => {
			const saves: Promise<unknown>[] = [];

			if (!isBulk && first) {
				saves.push(
					trpcClient.roster.updateNurse.mutate({
						nurseId: first.nurseId,
						name: data.name ?? first.name,
						designation: data.designation,
					}),
				);
			}

			for (const nurse of nurses) {
				const morningVal = editingFields.has("morning")
					? data.morning
					: nurse.morning;
				const eveningVal = editingFields.has("evening")
					? data.evening
					: nurse.evening;
				const nightVal = editingFields.has("night") ? data.night : nurse.night;

				saves.push(
					trpcClient.roster.updateNurseShiftPreferences.mutate({
						preferences: [
							{
								nurseId: nurse.nurseId,
								shiftId: "shift_morning",
								weight: Math.round((morningVal / totalDays) * 100),
								active: nurse.active,
							},
							{
								nurseId: nurse.nurseId,
								shiftId: "shift_evening",
								weight: Math.round((eveningVal / totalDays) * 100),
								active: nurse.active,
							},
							{
								nurseId: nurse.nurseId,
								shiftId: "shift_night",
								weight: Math.round((nightVal / totalDays) * 100),
								active: nurse.active,
							},
						],
						daysInMonth: totalDays,
					}),
				);
			}

			await Promise.all(saves);
		},
		onSuccess: (_data, variables) => {
			setEditingFields(new Set());
			toast.success(
				isBulk
					? `Updated ${nurses.length} nurses successfully`
					: "Nurse updated successfully",
			);
			if (!isBulk && first) {
				onSave?.(
					first.nurseId,
					variables.morning,
					variables.evening,
					variables.night,
				);
			}
			onOpenChange(false);
			queryClient.invalidateQueries({ queryKey: ["schedules"] });
		},
		onError: (error) => {
			toast.error(
				isBulk ? "Failed to update nurses" : "Failed to update nurse",
				{
					description: error instanceof Error ? error.message : "Unknown error",
				},
			);
		},
	});

	const onSubmit = (data: NurseEditForm) => {
		mutate(data);
	};

	const nightW = useWatch({ control, name: "night" });

	const fieldProps = {
		morning: register("morning", { valueAsNumber: true }),
		evening: register("evening", { valueAsNumber: true }),
		night: register("night", { valueAsNumber: true }),
		off: register("off", { valueAsNumber: true }),
	};

	const hasEdits = editingFields.size > 0;
	const title = isBulk ? `Bulk Update (${nurses.length} nurses)` : "Edit Nurse";
	const nurseNames = nurses.map((n) => n.name).join(", ");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-4 py-4">
						{isBulk && (
							<div className="flex flex-col gap-1.5">
								<Label>Selected Nurses</Label>
								<div className="max-h-24 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 text-sm">
									{nurseNames}
								</div>
							</div>
						)}

						{!isBulk && first && (
							<>
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="edit-name">Name</Label>
									<Input
										id="edit-name"
										placeholder="Nurse name"
										{...register("name")}
									/>
									{errors.name && (
										<p className="text-destructive text-xs">
											{errors.name.message as string}
										</p>
									)}
								</div>

								<div className="flex flex-row gap-4">
									<div className="flex w-1/3 flex-col gap-1.5">
										<Label htmlFor="edit-order">Order</Label>
										<Input
											id="edit-order"
											placeholder="Order"
											value={first.sortOrder ?? ""}
											readOnly
										/>
									</div>
									<div className="flex w-2/3 flex-col gap-1.5">
										<Label htmlFor="edit-designation">Designation</Label>
										<Input
											id="edit-designation"
											placeholder="Designation"
											{...register("designation")}
										/>
									</div>
								</div>
							</>
						)}

						<div className="flex items-center justify-between">
							<p className="font-medium text-sm">Shift Counts</p>
						</div>
						<div className="grid grid-cols-4 gap-3">
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="edit-morning">
										<div className="inline-flex items-center gap-1.5">
											<div className="rounded bg-amber-200 p-1 text-amber-900">
												<Sun className="h-4 w-4" />
											</div>
											M
										</div>
									</Label>
									<button
										type="button"
										onClick={() => toggleEdit("morning")}
										className={cn(
											"rounded p-0.5 transition-colors",
											editingFields.has("morning")
												? "text-blue-600 hover:text-blue-800"
												: "text-gray-300 hover:text-gray-500",
										)}
									>
										<Pencil className="h-3 w-3" />
									</button>
								</div>
								<Input
									id="edit-morning"
									type="number"
									min={0}
									max={totalDays}
									readOnly={!editingFields.has("morning")}
									className={
										!editingFields.has("morning")
											? "opacity-60 [&::-webkit-inner-spin-button]:appearance-none"
											: undefined
									}
									{...fieldProps.morning}
									onChange={fieldProps.morning.onChange}
								/>
								{errors.morning && (
									<p className="text-destructive text-xs">
										{errors.morning.message}
									</p>
								)}
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="edit-evening">
										<div className="inline-flex items-center gap-1.5">
											<div className="rounded bg-blue-200 p-1 text-blue-900">
												<Sunset className="h-4 w-4" />
											</div>
											E
										</div>
									</Label>
									<button
										type="button"
										onClick={() => toggleEdit("evening")}
										className={cn(
											"rounded p-0.5 transition-colors",
											editingFields.has("evening")
												? "text-blue-600 hover:text-blue-800"
												: "text-gray-300 hover:text-gray-500",
										)}
									>
										<Pencil className="h-3 w-3" />
									</button>
								</div>
								<Input
									id="edit-evening"
									type="number"
									min={0}
									max={totalDays}
									readOnly={!editingFields.has("evening")}
									className={
										!editingFields.has("evening")
											? "opacity-60 [&::-webkit-inner-spin-button]:appearance-none"
											: undefined
									}
									{...fieldProps.evening}
									onChange={fieldProps.evening.onChange}
								/>
								{errors.evening && (
									<p className="text-destructive text-xs">
										{errors.evening.message}
									</p>
								)}
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="edit-night">
										<div className="inline-flex items-center gap-1.5">
											<div className="rounded bg-violet-200 p-1 text-violet-900">
												<Moon className="h-4 w-4" />
											</div>
											N
										</div>
									</Label>
									<button
										type="button"
										onClick={() => toggleEdit("night")}
										className={cn(
											"rounded p-0.5 transition-colors",
											editingFields.has("night")
												? "text-blue-600 hover:text-blue-800"
												: "text-gray-300 hover:text-gray-500",
										)}
									>
										<Pencil className="h-3 w-3" />
									</button>
								</div>
								<Input
									id="edit-night"
									type="number"
									min={0}
									max={totalDays}
									readOnly={!editingFields.has("night")}
									className={
										!editingFields.has("night")
											? "opacity-60 [&::-webkit-inner-spin-button]:appearance-none"
											: undefined
									}
									{...fieldProps.night}
									onChange={fieldProps.night.onChange}
								/>
								{errors.night && (
									<p className="text-destructive text-xs">
										{errors.night.message}
									</p>
								)}
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="edit-off">
										<div className="inline-flex items-center gap-1.5">
											<div className="rounded bg-gray-200 p-1 text-gray-500">
												<Coffee className="h-4 w-4" />
											</div>
											O
										</div>
									</Label>
									<button
										type="button"
										onClick={() => toggleEdit("off")}
										className={cn(
											"rounded p-0.5 transition-colors",
											editingFields.has("off")
												? "text-blue-600 hover:text-blue-800"
												: "text-gray-300 hover:text-gray-500",
										)}
									>
										<Pencil className="h-3 w-3" />
									</button>
								</div>
								<Input
									id="edit-off"
									type="number"
									min={0}
									max={totalDays}
									readOnly={!editingFields.has("off")}
									className={
										!editingFields.has("off")
											? "opacity-60 [&::-webkit-inner-spin-button]:appearance-none"
											: undefined
									}
									{...fieldProps.off}
									onChange={fieldProps.off.onChange}
								/>
								{nightW >= 2 && (
									<span className="inline-flex items-center gap-0.5 self-start rounded bg-violet-100 px-1.5 py-0.5 font-semibold text-[10px] text-violet-700">
										+ {Math.floor(nightW / 2)} night off
									</span>
								)}
								{errors.off && (
									<p className="text-destructive text-xs">
										{errors.off.message}
									</p>
								)}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={
								(!isBulk && (!hasEdits || !isValid || isPending)) ||
								(isBulk && (editingFields.size === 0 || !isValid || isPending))
							}
						>
							{isPending
								? "Saving..."
								: isBulk
									? `Update All (${editingFields.size})`
									: "Save Changes"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
