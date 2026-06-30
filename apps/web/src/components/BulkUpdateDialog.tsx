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
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { NurseState } from "@/features/shift-manager/types";
import { trpcClient } from "@/utils/trpc";

type BulkUpdateForm = {
	morning: number;
	evening: number;
	night: number;
	off: number;
};

type BulkMutationInput = {
	morning: number | null;
	evening: number | null;
	night: number | null;
};

interface BulkUpdateDialogProps {
	selectedNurses: NurseState[];
	totalDays: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function BulkUpdateDialog({
	selectedNurses,
	totalDays,
	open,
	onOpenChange,
}: BulkUpdateDialogProps) {
	const queryClient = useQueryClient();
	const [editingFields, setEditingFields] = useState<Set<string>>(
		() => new Set(),
	);

	function toggleEdit(field: string) {
		setEditingFields((prev) => {
			const next = new Set(prev);
			if (next.has(field)) next.delete(field);
			else next.add(field);
			return next;
		});
	}

	useEffect(() => {
		if (!open) setEditingFields(new Set());
	}, [open]);

	const bulkUpdateSchema = z
		.object({
			morning: z.number().int().min(0).max(totalDays),
			evening: z.number().int().min(0).max(totalDays),
			night: z.number().int().min(0).max(totalDays),
			off: z.number().int().min(0).max(totalDays),
		})
		.refine((d) => d.morning + d.evening + d.night <= totalDays, {
			message: `Total must not exceed ${totalDays}`,
			path: ["night"],
		});

	const first = selectedNurses[0];

	const {
		register,
		handleSubmit,
		formState: { errors, isValid, dirtyFields },
		reset,
		control,
		setValue,
	} = useForm<BulkUpdateForm>({
		resolver: zodResolver(bulkUpdateSchema),
		mode: "onChange",
		defaultValues: {
			morning: first?.morning ?? 0,
			evening: first?.evening ?? 0,
			night: first?.night ?? 0,
			off: first
				? Math.max(0, totalDays - first.morning - first.evening - first.night)
				: 0,
		},
	});

	useEffect(() => {
		if (open && first) {
			lastTouched.current = null;
			reset({
				morning: first.morning,
				evening: first.evening,
				night: first.night,
				off: Math.max(
					0,
					totalDays - first.morning - first.evening - first.night,
				),
			});
		}
	}, [open, first, totalDays, reset]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["bulk-update-nurses"],
		mutationFn: async (changes: BulkMutationInput) => {
			await Promise.all(
				selectedNurses.map((nurse) => {
					const morningVal =
						changes.morning !== null ? changes.morning : nurse.morning;
					const eveningVal =
						changes.evening !== null ? changes.evening : nurse.evening;
					const nightVal = changes.night !== null ? changes.night : nurse.night;

					return trpcClient.roster.updateNurseShiftPreferences.mutate({
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
					});
				}),
			);
		},
		onSuccess: () => {
			setEditingFields(new Set());
			toast.success(
				`Updated ${selectedNurses.length} nurse${selectedNurses.length > 1 ? "s" : ""} successfully`,
			);
			onOpenChange(false);
			queryClient.invalidateQueries({ queryKey: ["schedules"] });
		},
		onError: (error) => {
			toast.error("Failed to update nurses", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

	// ── Sync off ↔ morning ─────────────────────────────────

	const lastTouched = useRef<"m" | "e" | "n" | "o" | null>(null);

	const morningW = useWatch({ control, name: "morning" });
	const eveningW = useWatch({ control, name: "evening" });
	const nightW = useWatch({ control, name: "night" });
	const offW = useWatch({ control, name: "off" });

	const isFirstRender = useRef(true);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		if (lastTouched.current === "o") {
			setValue("morning", Math.max(0, totalDays - eveningW - nightW - offW));
		} else {
			setValue("off", Math.max(0, totalDays - morningW - eveningW - nightW));
		}
	}, [morningW, eveningW, nightW, offW, totalDays, setValue]);

	// ── Submit ──────────────────────────────────────────────

	const onSubmit = (data: BulkUpdateForm) => {
		mutate({
			morning: dirtyFields.morning ? data.morning : null,
			evening: dirtyFields.evening ? data.evening : null,
			night: dirtyFields.night ? data.night : null,
		});
	};

	// ── Register helpers ────────────────────────────────────

	const fieldProps = {
		morning: register("morning", { valueAsNumber: true }),
		evening: register("evening", { valueAsNumber: true }),
		night: register("night", { valueAsNumber: true }),
		off: register("off", { valueAsNumber: true }),
	};

	const nurseNames = selectedNurses.map((n) => n.name).join(", ");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogHeader>
						<DialogTitle>
							Bulk Update ({selectedNurses.length} nurse
							{selectedNurses.length > 1 ? "s" : ""})
						</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-4 py-4">
						<div className="flex flex-col gap-1.5">
							<Label>Selected Nurses</Label>
							<div className="max-h-24 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 text-sm">
								{nurseNames}
							</div>
						</div>
						<div className="grid grid-cols-4 gap-3">
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="bulk-morning">
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
									id="bulk-morning"
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
									onChange={(e) => {
										fieldProps.morning.onChange(e);
										lastTouched.current = "m";
									}}
								/>
								{errors.morning && (
									<p className="text-destructive text-xs">
										{errors.morning.message}
									</p>
								)}
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="bulk-evening">
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
									id="bulk-evening"
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
									onChange={(e) => {
										fieldProps.evening.onChange(e);
										lastTouched.current = "e";
									}}
								/>
								{errors.evening && (
									<p className="text-destructive text-xs">
										{errors.evening.message}
									</p>
								)}
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="bulk-night">
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
									id="bulk-night"
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
									onChange={(e) => {
										fieldProps.night.onChange(e);
										lastTouched.current = "n";
									}}
								/>
								{errors.night && (
									<p className="text-destructive text-xs">
										{errors.night.message}
									</p>
								)}
							</div>
							<div className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="bulk-off">
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
									id="bulk-off"
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
									onChange={(e) => {
										fieldProps.off.onChange(e);
										lastTouched.current = "o";
									}}
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
							disabled={editingFields.size === 0 || !isValid || isPending}
						>
							{isPending ? "Updating..." : "Update All"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
