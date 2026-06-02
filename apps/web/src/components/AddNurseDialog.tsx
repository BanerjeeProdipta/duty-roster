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
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { trpcClient } from "@/utils/trpc";

const addNurseSchema = z
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

type AddNurseForm = z.infer<typeof addNurseSchema>;

export function AddNurseDialog() {
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();

	const {
		register,
		handleSubmit,
		formState: { errors, isValid },
		reset,
	} = useForm<AddNurseForm>({
		resolver: zodResolver(addNurseSchema),
		mode: "onChange",
		defaultValues: {
			name: "",
			morning: 0,
			evening: 0,
			night: 0,
		},
	});

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-nurse"],
		mutationFn: async (data: AddNurseForm) => {
			return await trpcClient.roster.createNurse.mutate(data);
		},
		onSuccess: () => {
			toast.success("Nurse added successfully");
			setOpen(false);
			reset();
			queryClient.invalidateQueries({ queryKey: ["schedules"] });
		},
		onError: (error) => {
			toast.error("Failed to add nurse", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});

	const onSubmit = (data: AddNurseForm) => {
		mutate(data);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				variant="outline"
				size="sm"
				className="border-accent-primary/20 bg-accent-primary-light/80 text-accent-primary-dark transition-all hover:border-accent-primary/35 hover:bg-accent-primary-light hover:text-accent-primary"
				onClick={() => setOpen(true)}
			>
				<PlusIcon className="mr-1 h-4 w-4" />
				Add Nurse
			</Button>
			<DialogContent>
				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogHeader>
						<DialogTitle>Add New Nurse</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="name">Name</Label>
							<Input id="name" placeholder="Nurse name" {...register("name")} />
							{errors.name && (
								<p className="text-destructive text-xs">
									{errors.name.message}
								</p>
							)}
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="morning">
								Morning preference{" "}
								<span className="font-normal text-gray-400">(0-100)</span>
							</Label>
							<Input
								id="morning"
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
							<Label htmlFor="evening">
								Evening preference{" "}
								<span className="font-normal text-gray-400">(0-100)</span>
							</Label>
							<Input
								id="evening"
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
							<Label htmlFor="night">
								Night preference{" "}
								<span className="font-normal text-gray-400">(0-100)</span>
							</Label>
							<Input
								id="night"
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
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!isValid || isPending}>
							{isPending ? "Adding..." : "Add Nurse"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
