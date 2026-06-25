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
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { trpcClient } from "@/utils/trpc";

// We'll build a schema inside the component so we can validate against `totalDays`
type EditNurseForm = {
	name: string;
	designation?: string | undefined;
	morning: number;
	evening: number;
	night: number;
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
}

export function EditNurseDialog({
	nurse,
	totalDays,
	open,
	onOpenChange,
}: EditNurseDialogProps) {
	const queryClient = useQueryClient();

	// Build a zod schema that validates counts against `totalDays`.
	const editNurseSchema = z
		.object({
			name: z.string().min(1, "Name is required"),
			designation: z.string().optional(),
			morning: z.number().int().min(0).max(totalDays),
			evening: z.number().int().min(0).max(totalDays),
			night: z.number().int().min(0).max(totalDays),
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
	} = useForm<EditNurseForm>({
		resolver: zodResolver(editNurseSchema),
		mode: "onChange",
		defaultValues: {
			name: nurse.name,
			designation: nurse.designation ?? "",
			// show absolute counts (not weighted percentages)
			morning: nurse.morning,
			evening: nurse.evening,
			night: nurse.night,
		},
	});

	// Reset form values when nurse prop changes or dialog opens
	useEffect(() => {
		if (open) {
			reset({
				name: nurse.name,
				designation: nurse.designation ?? "",
				morning: nurse.morning,
				evening: nurse.evening,
				night: nurse.night,
			});
		}
	}, [open, nurse, totalDays, reset]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["edit-nurse", nurse.nurseId],
		mutationFn: async (data: EditNurseForm) => {
			// Convert absolute counts back to percentage weights expected by backend
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
		onSuccess: () => {
			toast.success("Nurse updated successfully");
			onOpenChange(false);
			queryClient.invalidateQueries({ queryKey: ["schedules"] });
		},
		onError: (error) => {
			toast.error("Failed to update nurse", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

	const onSubmit = (data: EditNurseForm) => {
		mutate(data);
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
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="edit-morning">
								Morning preference{" "}
								<span className="font-normal text-gray-400">
									(0-{totalDays})
								</span>
							</Label>
							<Input
								id="edit-morning"
								type="number"
								min={0}
								max={totalDays}
								{...register("morning", { valueAsNumber: true })}
							/>
							{errors.morning && (
								<p className="text-destructive text-xs">
									{errors.morning.message}
								</p>
							)}
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="edit-evening">
								Evening preference{" "}
								<span className="font-normal text-gray-400">
									(0-{totalDays})
								</span>
							</Label>
							<Input
								id="edit-evening"
								type="number"
								min={0}
								max={totalDays}
								{...register("evening", { valueAsNumber: true })}
							/>
							{errors.evening && (
								<p className="text-destructive text-xs">
									{errors.evening.message}
								</p>
							)}
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="edit-night">
								Night preference{" "}
								<span className="font-normal text-gray-400">
									(0-{totalDays})
								</span>
							</Label>
							<Input
								id="edit-night"
								type="number"
								min={0}
								max={totalDays}
								{...register("night", { valueAsNumber: true })}
							/>
							{errors.night && (
								<p className="text-destructive text-xs">
									{errors.night.message}
								</p>
							)}
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
