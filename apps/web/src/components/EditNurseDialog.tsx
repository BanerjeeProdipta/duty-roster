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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Coffee, Moon, Pencil, PencilOff, Sun, Sunset } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { trpcClient } from "@/utils/trpc";

type EditNurseForm = {
	name: string;
	designation?: string | undefined;
	morning: number;
	evening: number;
	night: number;
	off: number;
};

interface EditNurseDialogProps {
	nurse: {
		nurseId: string;
		name: string;
		morning: number;
		evening: number;
		night: number;
		sortOrder?: number | null;
		designation?: string | null;
		active: boolean;
	};
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

export function EditNurseDialog({
	nurse,
	totalDays,
	open,
	onOpenChange,
	onSave,
}: EditNurseDialogProps) {
	const queryClient = useQueryClient();
	const [isEditing, setIsEditing] = useState(false);

	useEffect(() => {
		if (!open) setIsEditing(false);
	}, [open]);

	const editNurseSchema = z
		.object({
			name: z.string().min(1, "Name is required"),
			designation: z.string().optional(),
			morning: z.number().int().min(0).max(totalDays),
			evening: z.number().int().min(0).max(totalDays),
			night: z.number().int().min(0).max(totalDays),
			off: z.number().int().min(0).max(totalDays),
		})
		.refine((d) => d.morning + d.evening + d.night <= totalDays, {
			message: `Total must not exceed ${totalDays}`,
			path: ["night"],
		});

	const {
		register,
		handleSubmit,
		formState: { errors, isValid },
		reset,
		control,
		setValue,
	} = useForm<EditNurseForm>({
		resolver: zodResolver(editNurseSchema),
		mode: "onChange",
		defaultValues: {
			name: nurse.name,
			designation: nurse.designation ?? "",
			morning: nurse.morning,
			evening: nurse.evening,
			night: nurse.night,
			off: Math.max(0, totalDays - nurse.morning - nurse.evening - nurse.night),
		},
	});

	useEffect(() => {
		if (open) {
			lastTouched.current = null;
			reset({
				name: nurse.name,
				designation: nurse.designation ?? "",
				morning: nurse.morning,
				evening: nurse.evening,
				night: nurse.night,
				off: Math.max(
					0,
					totalDays - nurse.morning - nurse.evening - nurse.night,
				),
			});
		}
	}, [open, nurse, totalDays, reset]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["edit-nurse", nurse.nurseId],
		mutationFn: async (data: EditNurseForm) => {
			const morningWeight = Math.round((data.morning / totalDays) * 100);
			const eveningWeight = Math.round((data.evening / totalDays) * 100);
			const nightWeight = Math.round((data.night / totalDays) * 100);

			await Promise.all([
				trpcClient.roster.updateNurse.mutate({
					nurseId: nurse.nurseId,
					name: data.name,
					designation: data.designation,
				}),
				trpcClient.roster.updateNurseShiftPreferences.mutate({
					preferences: [
						{
							nurseId: nurse.nurseId,
							shiftId: "shift_morning",
							weight: morningWeight,
							active: nurse.active,
						},
						{
							nurseId: nurse.nurseId,
							shiftId: "shift_evening",
							weight: eveningWeight,
							active: nurse.active,
						},
						{
							nurseId: nurse.nurseId,
							shiftId: "shift_night",
							weight: nightWeight,
							active: nurse.active,
						},
					],
					daysInMonth: totalDays,
				}),
			]);
		},
		onSuccess: (_data, variables) => {
			setIsEditing(false);
			toast.success("Nurse updated successfully");
			onSave?.(
				nurse.nurseId,
				variables.morning,
				variables.evening,
				variables.night,
			);
			onOpenChange(false);
			queryClient.invalidateQueries({ queryKey: ["schedules"] });
		},
		onError: (error) => {
			toast.error("Failed to update nurse", {
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

	const onSubmit = (data: EditNurseForm) => {
		mutate(data);
	};

	// ── Register helpers ────────────────────────────────────

	const fieldProps = {
		morning: register("morning", { valueAsNumber: true }),
		evening: register("evening", { valueAsNumber: true }),
		night: register("night", { valueAsNumber: true }),
		off: register("off", { valueAsNumber: true }),
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogHeader>
						<DialogTitle>Edit Nurse: {nurse.name}</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-4 py-4">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="edit-name">Name</Label>
							<Input
								id="edit-name"
								placeholder="Nurse name"
								{...register("name")}
							/>
							{errors.name && (
								<p className="text-destructive text-xs">
									{errors.name.message}
								</p>
							)}
						</div>
						<div className="flex flex-row gap-4">
							<div className="flex w-1/3 flex-col gap-1.5">
								<Label htmlFor="edit-order">Order</Label>
								<Input
									id="edit-order"
									placeholder="Order"
									value={nurse.sortOrder ?? ""}
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
								{errors.designation && (
									<p className="text-destructive text-xs">
										{errors.designation.message}
									</p>
								)}
							</div>
						</div>
						<div className="flex items-center justify-between">
							<p className="font-medium text-sm">Shift Counts</p>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-8 gap-1.5 text-xs"
								onClick={() => setIsEditing(!isEditing)}
							>
								{isEditing ? (
									<PencilOff className="h-3.5 w-3.5" />
								) : (
									<Pencil className="h-3.5 w-3.5" />
								)}
								{isEditing ? "Lock" : "Edit"}
							</Button>
						</div>
						<div className="grid grid-cols-4 gap-3">
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="edit-morning">
									<div className="inline-flex items-center gap-1.5">
										<div className="rounded bg-amber-200 p-1 text-amber-900">
											<Sun className="h-4 w-4" />
										</div>
										M
									</div>
								</Label>
								<Input
									id="edit-morning"
									type="number"
									min={0}
									max={totalDays}
									readOnly={!isEditing}
									className={
										!isEditing
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
								<Label htmlFor="edit-evening">
									<div className="inline-flex items-center gap-1.5">
										<div className="rounded bg-blue-200 p-1 text-blue-900">
											<Sunset className="h-4 w-4" />
										</div>
										E
									</div>
								</Label>
								<Input
									id="edit-evening"
									type="number"
									min={0}
									max={totalDays}
									readOnly={!isEditing}
									className={
										!isEditing
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
								<Label htmlFor="edit-night">
									<div className="inline-flex items-center gap-1.5">
										<div className="rounded bg-violet-200 p-1 text-violet-900">
											<Moon className="h-4 w-4" />
										</div>
										N
									</div>
								</Label>
								<Input
									id="edit-night"
									type="number"
									min={0}
									max={totalDays}
									readOnly={!isEditing}
									className={
										!isEditing
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
								<Label htmlFor="edit-off">
									<div className="inline-flex items-center gap-1.5">
										<div className="rounded bg-gray-200 p-1 text-gray-500">
											<Coffee className="h-4 w-4" />
										</div>
										O
									</div>
								</Label>
								<Input
									id="edit-off"
									type="number"
									min={0}
									max={totalDays}
									readOnly={!isEditing}
									className={
										!isEditing
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
						<Button type="submit" disabled={!isValid || isPending}>
							{isPending ? "Saving..." : "Save Changes"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
