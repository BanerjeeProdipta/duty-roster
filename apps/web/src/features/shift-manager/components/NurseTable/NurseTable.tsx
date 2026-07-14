"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { Checkbox } from "@Duty-Roster/ui/components/checkbox";
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
import { useCallback, useEffect, useRef, useState } from "react";
import { DeleteNurseDialog } from "@/components/DeleteNurseDialog";
import { NurseEditDialog } from "@/components/NurseEditDialog";
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
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

	const allSelected = nurses.length > 0 && selectedIds.size === nurses.length;
	const someSelected = selectedIds.size > 0 && !allSelected;

	const pointerDownRef = useRef(false);
	const pointerStartIdRef = useRef<string | null>(null);
	const pointerBaseRef = useRef<Set<string> | null>(null);

	useEffect(() => {
		const up = () => {
			pointerDownRef.current = false;
			pointerStartIdRef.current = null;
			pointerBaseRef.current = null;
		};
		window.addEventListener("pointerup", up);
		return () => window.removeEventListener("pointerup", up);
	}, []);

	const selectRangeRef = useRef<
		| ((fromId: string, toId: string, base: Set<string>) => Set<string>)
		| undefined
	>(undefined);

	function selectRange(fromId: string, toId: string, base: Set<string>) {
		const ids = nurses.map((n) => n.nurseId);
		const fromIdx = ids.indexOf(fromId);
		const toIdx = ids.indexOf(toId);
		if (fromIdx === -1 || toIdx === -1) return base;
		const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
		const next = new Set(base);
		for (let i = start; i <= end; i++) {
			next.add(ids[i]);
		}
		return next;
	}
	selectRangeRef.current = selectRange;

	const handleSelectAll = useCallback(
		(checked: boolean) => {
			if (checked) {
				setSelectedIds(new Set(nurses.map((n) => n.nurseId)));
			} else {
				setSelectedIds(new Set());
			}
		},
		[nurses],
	);

	const handlePointerDown = useCallback(
		(nurseId: string, _shiftKey: boolean) => {
			pointerDownRef.current = true;
			pointerStartIdRef.current = nurseId;
			pointerBaseRef.current = new Set(selectedIds);

			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (prev.has(nurseId)) {
					next.delete(nurseId);
				} else {
					next.add(nurseId);
				}
				return next;
			});
		},
		[selectedIds],
	);

	const handlePointerEnter = useCallback((nurseId: string) => {
		if (
			!pointerDownRef.current ||
			!pointerStartIdRef.current ||
			nurseId === pointerStartIdRef.current
		)
			return;
		const base = pointerBaseRef.current ?? new Set();
		setSelectedIds(
			selectRangeRef.current?.(pointerStartIdRef.current, nurseId, base) ??
				base,
		);
	}, []);

	const handleCheckboxChange = useCallback(
		(nurseId: string, checked: boolean) => {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (checked) {
					next.add(nurseId);
				} else {
					next.delete(nurseId);
				}
				return next;
			});
		},
		[],
	);

	const selectedNurses = nurses.filter((n) => selectedIds.has(n.nurseId));

	const handleBulkDialogChange = useCallback((open: boolean) => {
		setBulkDialogOpen(open);
		if (!open) setSelectedIds(new Set());
	}, []);

	return (
		<>
			<div className="select-none overflow-hidden rounded-xl border bg-white">
				<Table className="min-w-210 table-fixed">
					<TableHeader>
						<TableRow className="bg-gray-50/50">
							<TableHead className="w-10 text-center">
								<Checkbox
									checked={allSelected}
									indeterminate={someSelected}
									onCheckedChange={(checked: boolean) =>
										handleSelectAll(checked)
									}
								/>
							</TableHead>
							<TableHead className="sticky left-0 z-20 w-48 bg-gray-50 text-left">
								<div className="flex items-center gap-2 overflow-hidden">
									<span className="truncate">Nurse</span>
									{selectedIds.size > 0 && (
										<Button
											variant="ghost"
											size="sm"
											className="h-5 shrink-0 rounded-full px-2 font-normal text-[10px] leading-none hover:bg-transparent hover:text-blue-600"
											onClick={() => setBulkDialogOpen(true)}
										>
											Update ({selectedIds.size})
										</Button>
									)}
								</div>
							</TableHead>
							<TableHead className="w-20 text-center">Active</TableHead>
							<TableHead className="w-16 text-center">
								<div className="inline-flex items-center gap-1.5">
									<div className="rounded bg-amber-200 p-1 text-amber-900">
										<Sun className="h-4 w-4" />
									</div>
									M
								</div>
							</TableHead>
							<TableHead className="w-16 text-center">
								<div className="inline-flex items-center gap-1.5">
									<div className="rounded bg-blue-200 p-1 text-blue-900">
										<Sunset className="h-4 w-4" />
									</div>
									E
								</div>
							</TableHead>
							<TableHead className="w-16 text-center">
								<div className="inline-flex items-center gap-1.5">
									<div className="rounded bg-violet-200 p-1 text-violet-900">
										<Moon className="h-4 w-4" />
									</div>
									N
								</div>
							</TableHead>
							<TableHead className="w-16 text-center">
								<div className="inline-flex items-center gap-1.5">
									<div className="rounded bg-gray-200 p-1 text-gray-500">
										<Coffee className="h-4 w-4" />
									</div>
									O
								</div>
							</TableHead>
							<TableHead className="w-20 text-center">Total</TableHead>
							<TableHead className="w-40 text-center">Action</TableHead>
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
								selected={selectedIds.has(nurse.nurseId)}
								onCheckboxChange={handleCheckboxChange}
								onPointerDown={handlePointerDown}
								onPointerEnter={handlePointerEnter}
							/>
						))}
					</TableBody>
				</Table>
			</div>
			<NurseEditDialog
				nurses={selectedNurses}
				totalDays={totalDays}
				open={bulkDialogOpen}
				onOpenChange={handleBulkDialogChange}
			/>
		</>
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
	selected: boolean;
	onCheckboxChange: (nurseId: string, checked: boolean) => void;
	onPointerDown: (nurseId: string, shiftKey: boolean) => void;
	onPointerEnter: (nurseId: string) => void;
}

function NurseTableRow({
	nurse,
	totalDays,
	onShiftChange,
	onActiveChange,
	selected,
	onCheckboxChange,
	onPointerDown,
	onPointerEnter,
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
					"cursor-pointer",
					isInvalid && "bg-red-50/30",
					draft.active ? "bg-white" : "bg-gray-100",
				)}
				onPointerDown={(e) => onPointerDown(nurse.nurseId, e.shiftKey)}
				onPointerEnter={() => onPointerEnter(nurse.nurseId)}
			>
				<TableCell
					className="w-10 text-right"
					onPointerDown={(e) => e.stopPropagation()}
				>
					<Checkbox
						checked={selected}
						onCheckedChange={(checked: boolean) =>
							onCheckboxChange(nurse.nurseId, checked)
						}
					/>
				</TableCell>
				<TableCell
					className={cn(
						"sticky left-0 z-10 w-48",
						draft.active ? "bg-white" : "bg-gray-100",
						isInvalid && "bg-red-50/30",
					)}
				>
					<div className="flex items-center gap-2 overflow-hidden">
						<div className="relative h-4 w-4 shrink-0">
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

						<div className="flex min-w-0 flex-col gap-1">
							<span
								className={cn(
									"truncate font-medium text-base text-gray-900",
									!draft.active && "text-gray-400 line-through",
								)}
								title={draft.name}
							>
								{draft.name}
								{draft.night === 0 && (
									<span className="pl-2 text-red-600">*</span>
								)}
							</span>
						</div>
					</div>
				</TableCell>
				<TableCell
					className="w-20 text-center"
					onPointerDown={(e) => e.stopPropagation()}
				>
					<ActiveToggle
						active={draft.active}
						isPending={isToggleActivePending}
						onToggle={handleToggleActive}
					/>
				</TableCell>
				<TableCell className="w-16 text-center">
					<span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md border border-amber-200/50 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
						{draft.morning}
					</span>
				</TableCell>
				<TableCell className="w-16 text-center">
					<span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md border border-blue-200/50 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
						{draft.evening}
					</span>
				</TableCell>
				<TableCell className="w-16 text-center">
					<span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md border border-violet-200/50 bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
						{draft.night}
					</span>
				</TableCell>

				<TableCell className="w-24 text-center">
					<div className="flex items-center justify-center gap-1">
						<span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md border border-gray-200/60 bg-gray-50 px-2.5 py-1 font-semibold text-gray-600">
							{draft.off}
						</span>

						{draft.night >= 2 && (
							<span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded bg-violet-100 px-1 py-0.5 font-bold text-[10px] text-violet-700">
								+{Math.floor(draft.night / 2)}
							</span>
						)}
					</div>
				</TableCell>
				<TableCell className="w-20 text-center">
					<span
						className={cn("font-medium text-sm", isInvalid && "text-red-600")}
					>
						{sum}/{totalDays}
					</span>
				</TableCell>
				<TableCell className="w-40">
					<div className="flex items-center justify-center gap-2">
						<Button
							variant="outline"
							size="sm"
							className="flex items-center gap-1 border-gray-200 font-medium text-gray-700 text-xs transition-all hover:bg-gray-50 hover:text-gray-900"
							onPointerDown={(e) => {
								e.stopPropagation();
								setEditDialogOpen(true);
							}}
						>
							<Pencil className="h-3.5 w-3.5" />
							Edit
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="flex items-center gap-1 border-red-100 font-medium text-red-500 text-xs transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
							onPointerDown={(e) => {
								e.stopPropagation();
								setDeleteDialogOpen(true);
							}}
						>
							<Trash2 className="h-3.5 w-3.5" />
							Delete
						</Button>
					</div>
				</TableCell>
			</TableRow>
			<NurseEditDialog
				nurses={[draft]}
				totalDays={totalDays}
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
				onSave={onShiftChange}
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
