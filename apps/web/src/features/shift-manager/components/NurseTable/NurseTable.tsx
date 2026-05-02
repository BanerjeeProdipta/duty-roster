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
import { VoiceInput } from "@Duty-Roster/ui/components/voice-input";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { AlertCircle, Check, Coffee, Moon, Sun, Sunset, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ShiftInput } from "@/features/shift-manager/components/ShiftInput";
import { FourWaySlider } from "@/features/shift-manager/components/Slider";
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
					<TableRow className="bg-slate-50/50">
						<TableHead className="w-[280px]">Nurse</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-center">
							<div className="inline-flex items-center gap-1.5">
								<div className="rounded bg-amber-200 p-1 text-amber-900">
									<Sun className="h-4 w-4" />
								</div>
								Morning
							</div>
						</TableHead>
						<TableHead className="text-center">
							<div className="inline-flex items-center gap-1.5">
								<div className="rounded bg-blue-200 p-1 text-blue-900">
									<Sunset className="h-4 w-4" />
								</div>
								Evening
							</div>
						</TableHead>
						<TableHead className="text-center">
							<div className="inline-flex items-center gap-1.5">
								<div className="rounded bg-violet-200 p-1 text-violet-900">
									<Moon className="h-4 w-4" />
								</div>
								Night
							</div>
						</TableHead>
						<TableHead className="text-center">
							<div className="inline-flex items-center gap-1.5">
								<div className="rounded bg-slate-200 p-1 text-slate-500">
									<Coffee className="h-4 w-4" />
								</div>
								Off
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
	const [isEditingName, setIsEditingName] = useState(false);
	const [editName, setEditName] = useState(nurse.name);
	const isFirstRender = useRef(true);
	const prevActiveRef = useRef(nurse.active ?? true);

	const {
		draft,
		sum,
		isInvalid,
		hasChanged,
		isSavingPending,
		isToggleActivePending,
		handleFieldChange,
		handleSave,
		handleCancel,
		handleToggleActive,
		handleUpdateName,
	} = useNurseCard({ nurse, totalDays });

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		onShiftChange?.(nurse.nurseId, draft.morning, draft.evening, draft.night);
	}, [draft.morning, draft.evening, draft.night, nurse.nurseId, onShiftChange]);

	useEffect(() => {
		if (isFirstRender.current) return;
		if (prevActiveRef.current !== draft.active) {
			prevActiveRef.current = draft.active;
			onActiveChange?.(nurse.nurseId, draft.active);
		}
	}, [draft.active, nurse.nurseId, onActiveChange]);

	const handleStartEditing = () => {
		setEditName(draft.name);
		setIsEditingName(true);
	};

	const handleSaveAll = () => {
		// Save name if changed
		if (editName.trim() && editName !== draft.name) {
			handleUpdateName(editName.trim());
		}
		// Save shift changes if any
		if (hasChanged) {
			handleSave();
		}
		setIsEditingName(false);
	};

	const handleCancelAll = () => {
		setEditName(draft.name);
		setIsEditingName(false);
		if (hasChanged) {
			handleCancel();
		}
	};

	return (
		<>
			<TableRow className={cn(isInvalid && "bg-red-50/30")}>
				<TableCell>
					<div className="flex flex-col gap-1">
						{isEditingName ? (
							<div className="flex items-center gap-2">
								<input
									type="text"
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") handleSaveAll();
										if (e.key === "Escape") handleCancelAll();
									}}
									className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
								/>
								<VoiceInput
									language="bn-BD"
									onTranscript={(transcript) => setEditName(transcript)}
								/>
							</div>
						) : (
							<Button
								variant="ghost"
								className={cn(
									"cursor-pointer pl-4 font-medium text-lg hover:underline",
									!draft.active && "text-slate-900",
								)}
								onClick={handleStartEditing}
							>
								{draft.name}
							</Button>
						)}
						{isInvalid && (
							<span className="flex items-center gap-1 font-medium text-red-500 text-xs">
								<AlertCircle className="h-3 w-3" />
								Invalid distribution
							</span>
						)}
					</div>
				</TableCell>
				<TableCell>
					<ActiveToggle
						active={draft.active}
						isPending={isToggleActivePending}
						onToggle={handleToggleActive}
					/>
				</TableCell>
				<TableCell>
					<ShiftInput
						color="bg-[#FDE68A]"
						value={draft.morning}
						onChange={(val) => handleFieldChange("morning", val)}
						max={totalDays}
					/>
				</TableCell>
				<TableCell>
					<ShiftInput
						color="bg-[#BFDBFE]"
						value={draft.evening}
						onChange={(val) => handleFieldChange("evening", val)}
						max={totalDays}
					/>
				</TableCell>
				<TableCell>
					<ShiftInput
						color="bg-[#C4B5FD]"
						value={draft.night}
						onChange={(val) => handleFieldChange("night", val)}
						max={totalDays}
					/>
				</TableCell>
				<TableCell>
					<ShiftInput
						color="bg-[#E5E7EB]"
						value={draft.off}
						onChange={(val) => handleFieldChange("off", val)}
						max={totalDays}
					/>
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
							onClick={handleSaveAll}
							disabled={isSavingPending}
						>
							<Check className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleCancelAll}
							disabled={isSavingPending}
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</TableCell>
			</TableRow>
			<TableRow>
				<TableCell colSpan={8} className="p-0">
					<div className="px-4 py-2">
						<FourWaySlider
							total={totalDays}
							value={{
								morning: draft.morning,
								evening: draft.evening,
								night: draft.night,
								off: draft.off,
							}}
							onChange={(v) => {
								handleFieldChange("morning", v.morning);
								handleFieldChange("evening", v.evening);
								handleFieldChange("night", v.night);
							}}
						/>
					</div>
				</TableCell>
			</TableRow>
		</>
	);
}
