"use client";

import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Info,
	Lightbulb,
	TrendingDown,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import type {
	ShiftDeficit,
	SolverValidation,
} from "@/hooks/useSolverValidation";

interface SolverWarningsProps {
	solverValidation: SolverValidation;
	shiftDeficits: ShiftDeficit[];
	showExactMatchWarning: boolean;
	flexibilityMetrics?: Record<
		string,
		{
			required: number;
			needed: number;
			assignable: number;
			ratio: number;
			buffer: number;
		}
	>;
}

function Banner({
	icon: Icon,
	color,
	title,
	children,
}: {
	icon: typeof XCircle;
	color: "red" | "orange" | "yellow" | "emerald";
	title: string;
	children?: React.ReactNode;
}) {
	const colorStyles = {
		red: "border-red-200 bg-red-50 text-red-800",
		orange: "border-orange-200 bg-orange-50 text-orange-800",
		yellow: "border-yellow-200 bg-yellow-50 text-yellow-800",
		emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
	}[color];
	return (
		<div className={`rounded-lg border ${colorStyles} p-3`}>
			<div className="flex items-center gap-2">
				<Icon className="size-4 shrink-0" />
				<span className="font-medium text-sm">{title}</span>
			</div>
			{children}
		</div>
	);
}

function CollapsibleSection({
	label,
	open,
	onToggle,
	children,
}: {
	label: string;
	open: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}) {
	return (
		<div>
			<button
				type="button"
				onClick={onToggle}
				className="mt-2 flex items-center gap-1 font-medium text-gray-500 text-xs hover:text-gray-700"
			>
				{open ? (
					<ChevronDown className="size-3" />
				) : (
					<ChevronRight className="size-3" />
				)}
				{label}
			</button>
			{open && <div className="mt-2 flex flex-col gap-2">{children}</div>}
		</div>
	);
}

function InlineBadge({
	children,
	variant,
}: {
	children: React.ReactNode;
	variant?: "red" | "green";
}) {
	const variantStyle =
		variant === "red"
			? "bg-red-100 text-red-700"
			: variant === "green"
				? "bg-emerald-100 text-emerald-700"
				: "bg-gray-100 text-gray-600";
	return (
		<span
			className={`inline-flex items-center rounded px-1.5 py-0.5 font-medium text-xs ${variantStyle}`}
		>
			{children}
		</span>
	);
}

export function SolverWarnings({
	solverValidation,
	shiftDeficits,
	showExactMatchWarning,
	flexibilityMetrics,
}: SolverWarningsProps) {
	const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
	const toggleSection = (key: string) =>
		setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

	if (!solverValidation?.hasIssues && !showExactMatchWarning) return null;

	const infeasibleShifts = flexibilityMetrics
		? Object.entries(flexibilityMetrics)
				.filter(([, metrics]) => metrics.assignable < metrics.required)
				.map(([shift, metrics]) => ({
					shift,
					...metrics,
					deficit: metrics.required - metrics.assignable,
				}))
		: [];

	const tightShifts = flexibilityMetrics
		? Object.entries(flexibilityMetrics)
				.filter(
					([, metrics]) =>
						metrics.assignable >= metrics.required && metrics.buffer === 0,
				)
				.map(([shift, metrics]) => ({ shift, ...metrics }))
		: [];

	return (
		<div className="flex flex-col gap-2">
			{infeasibleShifts.length > 0 && (
				<Banner
					icon={XCircle}
					color="red"
					title="Schedule cannot be generated — some shifts lack capacity"
				>
					<CollapsibleSection
						label={`${infeasibleShifts.length} shift${infeasibleShifts.length > 1 ? "s" : ""} affected`}
						open={openSections.infeasible}
						onToggle={() => toggleSection("infeasible")}
					>
						{infeasibleShifts.map((shift) => (
							<div
								key={shift.shift}
								className="rounded border border-red-200 bg-white/60 p-2.5 text-xs"
							>
								<div className="mb-1.5 flex items-center justify-between">
									<span className="font-semibold text-red-900 capitalize">
										{shift.shift}
									</span>
									<InlineBadge>Ratio {shift.ratio.toFixed(2)}</InlineBadge>
								</div>
								<div className="mb-1.5 flex flex-wrap gap-x-4 gap-y-1">
									<span>Needed: {shift.needed}</span>
									<span>Required: {shift.required}</span>
									<span className="text-red-600">
										Assignable: {shift.assignable}
									</span>
									<span className="text-red-600">
										Deficit: -{shift.deficit}
									</span>
								</div>
								<div className="flex items-center gap-1 text-red-600">
									<Lightbulb className="size-3.5" />
									Reduce requirement by {shift.deficit} or increase nurse
									capacity.
								</div>
							</div>
						))}
						{solverValidation?.totalCapacity != null &&
							solverValidation.totalRequired != null &&
							solverValidation.totalRequired >
								solverValidation.totalCapacity && (
								<div className="rounded border border-red-200 bg-white/60 p-2.5 text-red-700 text-xs">
									Overall: {solverValidation.totalRequired} required /{" "}
									{solverValidation.totalCapacity} available — need{" "}
									<strong>
										{Math.ceil(
											(solverValidation.totalRequired -
												solverValidation.totalCapacity) /
												solverValidation.baseMaxShifts,
										)}
									</strong>{" "}
									more nurses.
								</div>
							)}
					</CollapsibleSection>
				</Banner>
			)}

			{tightShifts.length > 0 && (
				<Banner
					icon={TrendingDown}
					color="orange"
					title="Tight constraints — minimal buffer on some shifts"
				>
					<CollapsibleSection
						label="Show details"
						open={openSections.tight}
						onToggle={() => toggleSection("tight")}
					>
						<div className="flex flex-wrap gap-2">
							{tightShifts.map((shift) => (
								<div
									key={shift.shift}
									className="flex items-center gap-1.5 rounded border border-orange-200 bg-white/60 px-2.5 py-1.5 text-xs"
								>
									<span className="font-medium text-orange-900 capitalize">
										{shift.shift}
									</span>
									<span className="text-orange-600">
										{shift.needed}/{shift.required}
									</span>
									<InlineBadge>{shift.buffer} left</InlineBadge>
								</div>
							))}
						</div>
					</CollapsibleSection>
				</Banner>
			)}

			{solverValidation &&
				solverValidation.nurseOverlimits &&
				solverValidation.nurseOverlimits.length > 0 && (
					<Banner
						icon={AlertTriangle}
						color="red"
						title={`${solverValidation.nurseOverlimits.length} nurse${solverValidation.nurseOverlimits.length > 1 ? "s" : ""} exceed${solverValidation.nurseOverlimits.length > 1 ? "" : "s"} shift limits`}
					>
						<CollapsibleSection
							label="Show affected nurses"
							open={openSections.overlimits}
							onToggle={() => toggleSection("overlimits")}
						>
							{solverValidation.nurseOverlimits.slice(0, 6).map((nurse) => (
								<div
									key={nurse.name}
									className="flex items-center justify-between rounded border border-red-200 bg-white/60 px-2.5 py-1.5 text-xs"
								>
									<span className="font-medium text-red-800">{nurse.name}</span>
									<span className="text-red-600">
										{nurse.assignableTotal} /{" "}
										<strong className="text-red-700">{nurse.nurseMax}</strong>
									</span>
								</div>
							))}
							{solverValidation.nurseOverlimits.length > 6 && (
								<div className="text-gray-500 text-xs">
									+{solverValidation.nurseOverlimits.length - 6} more
								</div>
							)}
						</CollapsibleSection>
					</Banner>
				)}

			{shiftDeficits.length > 0 && (
				<Banner icon={Info} color="yellow" title="Preference coverage gaps">
					<CollapsibleSection
						label="Show details"
						open={openSections.deficit}
						onToggle={() => toggleSection("deficit")}
					>
						<div className="flex flex-wrap gap-2">
							{shiftDeficits.map((shift) => (
								<div
									key={shift.shift}
									className="flex items-center gap-1.5 rounded border border-yellow-200 bg-white/60 px-2.5 py-1.5 text-xs"
								>
									<span className="font-medium text-yellow-900 capitalize">
										{shift.shift}
									</span>
									<span className="text-yellow-700">
										{shift.required} required, {Math.max(0, shift.available)}{" "}
										available
									</span>
									<InlineBadge variant={shift.gap < 0 ? "red" : "green"}>
										{shift.gap < 0 ? shift.gap : `+${shift.gap}`}
									</InlineBadge>
								</div>
							))}
						</div>
					</CollapsibleSection>
				</Banner>
			)}

			{!solverValidation?.hasIssues &&
				infeasibleShifts.length === 0 &&
				tightShifts.length === 0 && (
					<Banner
						icon={CheckCircle2}
						color="emerald"
						title="All constraints met"
					/>
				)}
		</div>
	);
}
