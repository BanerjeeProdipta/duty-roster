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

const editNurseSchema = z
	.object({
		name: z.string().min(1, "Name is required"),
		morning: z.number().int().min(0).max(100),
		evening: z.number().int().min(0).max(100),
		night: z.number().int().min(0).max(100),
	})
	.refine((d) => d.morning + d.evening + d.night <= 100, {
		message: "Total must not exceed 100",
		path: ["night"],
	});

type EditNurseForm = z.infer<typeof editNurseSchema>;

interface EditNurseDialogProps {
	nurse: {
		nurseId: string;
		name: string;
		morning: number;
		evening: number;
		night: number;
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

	const initialMorning = Math.round((nurse.morning / totalDays) * 100);
	const initialEvening = Math.round((nurse.evening / totalDays) * 100);
	const initialNight = Math.round((nurse.night / totalDays) * 100);

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
			morning: initialMorning,
			evening: initialEvening,
			night: initialNight,
		},
	});

	// Reset form values when nurse prop changes or dialog opens
	useEffect(() => {
		if (open) {
			reset({
				name: nurse.name,
				morning: Math.round((nurse.morning / totalDays) * 100),
				evening: Math.round((nurse.evening / totalDays) * 100),
				night: Math.round((nurse.night / totalDays) * 100),
			});
		}
	}, [open, nurse, totalDays, reset]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["edit-nurse", nurse.nurseId],
		mutationFn: async (data: EditNurseForm) => {
			await Promise.all([
				trpcClient.roster.updateNurse.mutate({
					nurseId: nurse.nurseId,
					name: data.name,
				}),
				trpcClient.roster.updateNurseShiftPreferences.mutate({
					preferences: [
						{
							nurseId: nurse.nurseId,
							shiftId: "shift_morning",
							weight: data.morning,
							active: nurse.active,
						},
						{
							nurseId: nurse.nurseId,
							shiftId: "shift_evening",
							weight: data.evening,
							active: nurse.active,
						},
						{
							nurseId: nurse.nurseId,
							shiftId: "shift_night",
							weight: data.night,
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
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="edit-morning">
								Morning preference{" "}
								<span className="font-normal text-gray-400">(0-100)</span>
							</Label>
							<Input
								id="edit-morning"
								type="number"
								min={0}
								max={100}
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
								<span className="font-normal text-gray-400">(0-100)</span>
							</Label>
							<Input
								id="edit-evening"
								type="number"
								min={0}
								max={100}
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
								<span className="font-normal text-gray-400">(0-100)</span>
							</Label>
							<Input
								id="edit-night"
								type="number"
								min={0}
								max={100}
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
