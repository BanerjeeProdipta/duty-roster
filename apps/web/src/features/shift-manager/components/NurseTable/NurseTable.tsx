"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@Duty-Roster/ui/components/table";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { Coffee, Moon, Pencil, Sun, Sunset, Trash2 } from "lucide-react";
import { useState } from "react";
import { DeleteNurseDialog } from "@/components/DeleteNurseDialog";
import { EditNurseDialog } from "@/components/EditNurseDialog";
import { useNurseCard } from "@/features/shift-manager/hooks/useNurseCard";
import type { NurseState } from "@/features/shift-manager/types";
import { ActiveToggle } from "../NurseCard/ActiveToggle";

interface NurseTableProps {
	nurses: NurseState[];
	totalDays: number;
	onShiftChange?: (
		nurseId: string,
		morning: number,
		evening: number,
		night: number,
	) => void;
	onActiveChange?: (nurseId: string, active: boolean) => void;
}

export function NurseTable({
	nurses,
	totalDays,
	onShiftChange,
	onActiveChange,
}: NurseTableProps) {
	return (
		<div className="overflow-hidden rounded-xl border bg-white">
			<Table>
				<TableHeader>
					<TableRow className="bg-gray-50/50">
						<TableHead className="w-70 text-center">Nurse</TableHead>
						<TableHead className="text-center">Active</TableHead>
						<TableHead className="text-center">
							<div className="inline-flex items-center gap-1.5">
								<div className="rounded bg-amber-200 p-1 text-amber-900">
									<Sun className="h-4 w-4" />
								</div>
								M
							</div>
						</TableHead>
						<TableHead className="text-center">
							<div className="inline-flex items-center gap-1.5">
								<div className="rounded bg-blue-200 p-1 text-blue-900">
									<Sunset className="h-4 w-4" />
								</div>
								E
							</div>
						</TableHead>
						<TableHead className="text-center">
							<div className="inline-flex items-center gap-1.5">
								<div className="rounded bg-violet-200 p-1 text-violet-900">
									<Moon className="h-4 w-4" />
								</div>
								N
							</div>
						</TableHead>
						<TableHead className="text-center">
							<div className="inline-flex items-center gap-1.5">
								<div className="rounded bg-gray-200 p-1 text-gray-500">
									<Coffee className="h-4 w-4" />
								</div>
								O
							</div>
						</TableHead>
						<TableHead className="text-center">Total</TableHead>
						<TableHead className="text-center">Action</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{nurses.map((nurse) => (
						<NurseTableRow
							key={nurse.nurseId}
							nurse={nurse}
							totalDays={totalDays}
							onShiftChange={onShiftChange}
							onActiveChange={onActiveChange}
						/>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

interface NurseTableRowProps {
	nurse: NurseState;
	totalDays: number;
	onShiftChange?: (
		nurseId: string,
		morning: number,
		evening: number,
		night: number,
	) => void;
	onActiveChange?: (nurseId: string, active: boolean) => void;
}

function NurseTableRow({
	nurse,
	totalDays,
	onShiftChange,
	onActiveChange,
}: NurseTableRowProps) {
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);

	const { draft, sum, isInvalid, isToggleActivePending, handleToggleActive } =
		useNurseCard({
			nurse,
			totalDays,
			onShiftChange: (morning, evening, night) =>
				onShiftChange?.(nurse.nurseId, morning, evening, night),
			onActiveChange: (active) => onActiveChange?.(nurse.nurseId, active),
		});

	return (
		<>
			<TableRow
				className={cn(
					isInvalid && "bg-red-50/30",
					draft.active ? "bg-white" : "bg-gray-100",
				)}
			>
				<TableCell>
					<div className="flex items-center gap-2 pl-4">
						<div className="relative h-4 w-4">
							<div
								className={cn(
									"absolute inset-0 rounded-full",
									draft.active ? "bg-emerald-500/40" : "bg-rose-500/40",
								)}
							/>

							<div
								className={cn(
									"absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full",
									draft.active ? "bg-emerald-500" : "bg-rose-500",
								)}
							/>
						</div>

						<div className="flex flex-col gap-1">
							<span
								className={cn(
									"pl-2 font-medium text-base text-gray-900",
									!draft.active && "text-gray-400 line-through",
								)}
							>
								{draft.name}
							</span>
						</div>
					</div>
				</TableCell>
				<TableCell className="text-center">
					<ActiveToggle
						active={draft.active}
						isPending={isToggleActivePending}
						onToggle={handleToggleActive}
					/>
				</TableCell>
				<TableCell className="text-center">
					<span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md border border-amber-200/50 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
						{draft.morning}
					</span>
				</TableCell>
				<TableCell className="text-center">
					<span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md border border-blue-200/50 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
						{draft.evening}
					</span>
				</TableCell>
				<TableCell className="text-center">
					<span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md border border-violet-200/50 bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
						{draft.night}
					</span>
				</TableCell>

				<TableCell className="text-center">
					<div className="relative flex items-center justify-center gap-2">
						<span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md border border-gray-200/60 bg-gray-50 px-2.5 py-1 font-semibold text-gray-600">
							{draft.off}
						</span>

						{draft.night >= 2 && (
							<span className="absolute top-1/2 -right-6 inline-flex -translate-y-1/2 items-center justify-center whitespace-nowrap rounded bg-violet-100 px-1 py-0.5 font-bold text-[10px] text-violet-700">
								+ {Math.floor(draft.night / 2)}
							</span>
						)}
					</div>
				</TableCell>
				<TableCell className="text-center">
					<span
						className={cn("font-medium text-sm", isInvalid && "text-red-600")}
					>
						{sum}/{totalDays}
					</span>
				</TableCell>
				<TableCell>
					<div className="flex items-center justify-center gap-2">
						<Button
							variant="outline"
							size="sm"
							className="flex items-center gap-1 border-gray-200 font-medium text-gray-700 text-xs transition-all hover:bg-gray-50 hover:text-gray-900"
							onClick={() => setEditDialogOpen(true)}
						>
							<Pencil className="h-3.5 w-3.5" />
							Edit
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="flex items-center gap-1 border-red-100 font-medium text-red-500 text-xs transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
							onClick={() => setDeleteDialogOpen(true)}
						>
							<Trash2 className="h-3.5 w-3.5" />
							Delete
						</Button>
					</div>
				</TableCell>
			</TableRow>
			<EditNurseDialog
				nurse={draft}
				totalDays={totalDays}
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
			/>
			<DeleteNurseDialog
				nurseId={nurse.nurseId}
				nurseName={draft.name}
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
			/>
		</>
	);
}
