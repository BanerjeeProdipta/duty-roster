"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@Duty-Roster/ui/components/dialog";
import { Trash2 } from "lucide-react";
import { useDeleteNurse } from "@/hooks/useDeleteNurse";

interface DeleteNurseDialogProps {
	nurseId: string;
	nurseName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DeleteNurseDialog({
	nurseId,
	nurseName,
	open,
	onOpenChange,
}: DeleteNurseDialogProps) {
	const { mutate, isPending } = useDeleteNurse({
		onSuccess: () => {
			onOpenChange(false);
		},
	});

	const handleDelete = () => {
		mutate(nurseId);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Nurse</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete{" "}
						<span className="font-medium text-gray-900">{nurseName}</span>? This
						action cannot be undone. All schedules for this nurse will also be
						removed.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={handleDelete}
						disabled={isPending}
					>
						<Trash2 className="mr-1.5 h-4 w-4" />
						{isPending ? "Deleting..." : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
