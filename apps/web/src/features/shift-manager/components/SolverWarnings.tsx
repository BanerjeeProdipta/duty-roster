"use client";

import {
	AlertTriangle,
	CheckCircle2,
	Info,
	TrendingDown,
	XCircle,
} from "lucide-react";
import type {
	ShiftDeficit,
	SolverValidation,
} from "@/hooks/useSolverValidation";

interface SolverWarningsProps {
	solverValidation: SolverValidation;
	totalDays: number;
	shiftDeficits: ShiftDeficit[];
	showExactMatchWarning: boolean;
	/** Flexibility metrics from improved solver */
	flexibilityMetrics?: {
		[shift: string]: {
			required: number;
			needed: number; // current allocated (0 = req met)
			assignable: number;
			ratio: number;
			buffer: number;
		};
	};
}

export function SolverWarnings({
	solverValidation,
	totalDays,
	shiftDeficits,
	showExactMatchWarning,
	flexibilityMetrics,
}: SolverWarningsProps) {
	if (!solverValidation?.hasIssues && !showExactMatchWarning) return null;

	// Identify infeasible shifts (where assignable < required)
	const infeasibleShifts = flexibilityMetrics
		? Object.entries(flexibilityMetrics)
				.filter(([_, metrics]) => metrics.assignable < metrics.required)
				.map(([shift, metrics]) => ({
					shift,
					required: metrics.required,
					needed: metrics.needed,
					assignable: metrics.assignable,
					deficit: metrics.required - metrics.assignable,
					ratio: metrics.ratio,
				}))
		: [];

	// Identify tight constraints (buffer is 0)
	const tightShifts = flexibilityMetrics
		? Object.entries(flexibilityMetrics)
				.filter(
					([_, metrics]) =>
						metrics.assignable >= metrics.required && metrics.buffer === 0,
				)
				.map(([shift, metrics]) => ({
					shift,
					required: metrics.required,
					needed: metrics.needed,
					assignable: metrics.assignable,
					buffer: metrics.buffer,
					ratio: metrics.ratio,
				}))
		: [];

	const ShiftBadge = ({
		label,
		value,
		variant,
	}: {
		label: string;
		value: number | string;
		variant?: "default" | "danger" | "success";
	}) => (
		<div
			className={`rounded-lg px-3 py-2 text-center ${variant === "danger" ? "bg-red-100" : variant === "success" ? "bg-green-100" : "bg-slate-100"}`}
		>
			<div className="text-slate-500 text-xs">{label}</div>
			<div
				className={`font-bold ${variant === "danger" ? "text-red-700" : variant === "success" ? "text-green-700" : "text-slate-700"}`}
			>
				{value}
			</div>
		</div>
	);

	return (
		<div className="flex flex-col gap-3">
			{/* CRITICAL: Infeasible Shifts */}
			{infeasibleShifts.length > 0 && (
				<div className="relative overflow-hidden rounded-xl border border-red-200 bg-red-50/80 p-4 shadow-sm">
					<div className="absolute top-0 bottom-0 left-0 w-1 bg-red-500" />
					<div className="flex items-start gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
							<XCircle className="h-5 w-5 text-red-600" />
						</div>
						<div className="min-w-0 flex-1">
							<h4 className="font-bold text-lg text-red-800">
								Schedule Cannot Be Generated
							</h4>
							<p className="mt-1 text-red-600 text-sm">
								Some shifts have more coverage required than available capacity.
								Fix these issues before generating.
							</p>

							<div className="mt-4 space-y-3">
								{infeasibleShifts.map(
									({ shift, required, needed, assignable, deficit, ratio }) => (
										<div
											key={shift}
											className="rounded-lg border border-red-200 bg-white/70 p-3"
										>
											<div className="mb-3 flex items-center justify-between">
												<span className="flex items-center gap-2 font-semibold text-red-900 capitalize">
													{shift} Shift
												</span>
												<span className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-700 text-xs">
													Ratio: {ratio.toFixed(2)}
												</span>
											</div>

											<div className="mb-3 grid grid-cols-2 gap-2">
												<ShiftBadge label="Needed" value={needed} />
												<ShiftBadge label="Required" value={required} />
												<ShiftBadge
													label="Assignable"
													value={assignable}
													variant="danger"
												/>
												<ShiftBadge
													label="Deficit"
													value={`-${deficit}`}
													variant="danger"
												/>
											</div>

											<div className="rounded bg-red-50 p-2 text-red-700 text-xs">
												<span className="font-medium">Suggested fixes:</span>
												<ul className="mt-1 space-y-0.5 text-red-600">
													<li>
														• Reduce {shift} requirement by {deficit}
													</li>
													<li>• Increase nurse {shift} capacity</li>
												</ul>
											</div>
										</div>
									),
								)}
							</div>

							{solverValidation?.totalCapacity &&
								solverValidation?.totalRequired && (
									<div className="mt-4 rounded-lg border border-red-200 bg-white/70 p-3">
										<p className="mb-2 font-medium text-red-800 text-sm">
											Overall Capacity
										</p>
										<div className="mb-2 flex items-center gap-3">
											<div className="flex-1">
												<div className="mb-1 flex justify-between text-slate-600 text-xs">
													<span>Required</span>
													<span className="font-medium">
														{solverValidation.totalRequired}
													</span>
												</div>
											</div>
											<div className="flex-1">
												<div className="mb-1 flex justify-between text-slate-600 text-xs">
													<span>Available</span>
													<span className="font-medium">
														{solverValidation.totalCapacity}
													</span>
												</div>
											</div>
										</div>
										<p className="text-red-600 text-xs">
											Need{" "}
											<strong>
												{Math.ceil(
													(solverValidation.totalRequired -
														solverValidation.totalCapacity) /
														solverValidation.baseMaxShifts,
												)}
											</strong>{" "}
											more nurses or reduce requirements.
										</p>
									</div>
								)}
						</div>
					</div>
				</div>
			)}

			{/* WARNING: Capped Preferences */}
			{/* INFO: Tight Constraints */}
			{tightShifts.length > 0 && (
				<div className="relative overflow-hidden rounded-xl border border-orange-200 bg-orange-50/80 p-4 shadow-sm">
					<div className="absolute top-0 bottom-0 left-0 w-1 bg-orange-400" />
					<div className="flex items-start gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
							<TrendingDown className="h-5 w-5 text-orange-600" />
						</div>
						<div className="min-w-0 flex-1">
							<h4 className="font-bold text-lg text-orange-800">
								Tight Constraints
							</h4>
							<p className="mt-1 text-orange-700 text-sm">
								These shifts have minimal buffer. Small preference changes may
								cause issues.
							</p>

							<div className="mt-3 flex flex-wrap gap-2">
								{tightShifts.map(
									({ shift, required, needed, assignable, buffer }) => (
										<div
											key={shift}
											className="flex items-center gap-2 rounded-lg border border-orange-200 bg-white/70 px-3 py-2"
										>
											<span className="font-medium text-orange-900 capitalize">
												{shift}
											</span>
											<span className="text-orange-600 text-xs">
												• {needed}/{required} needed
											</span>
											<span className="rounded bg-orange-100 px-1.5 py-0.5 font-bold text-orange-700 text-xs">
												{buffer} left
											</span>
										</div>
									),
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* ERROR: Nurse-level issues */}
			{solverValidation?.nurseOverlimits &&
				solverValidation.nurseOverlimits.length > 0 && (
					<div className="relative overflow-hidden rounded-xl border border-red-200 bg-red-50/80 p-4 shadow-sm">
						<div className="absolute top-0 bottom-0 left-0 w-1 bg-red-500" />
						<div className="flex items-start gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
								<AlertTriangle className="h-5 w-5 text-red-600" />
							</div>
							<div className="min-w-0 flex-1">
								<h4 className="font-bold text-lg text-red-800">
									Nurses Exceed Shift Limits
								</h4>
								<p className="mt-1 text-red-600 text-sm">
									These nurses want more shifts than their maximum capacity.
								</p>

								<div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
									{solverValidation.nurseOverlimits.slice(0, 6).map((nurse) => (
										<div
											key={nurse.name}
											className="flex items-center justify-between rounded-lg border border-red-200 bg-white/70 px-3 py-2"
										>
											<span className="font-medium text-red-800 text-sm">
												{nurse.name}
											</span>
											<div className="flex items-center gap-1 text-xs">
												<span className="text-red-600">
													{nurse.assignableTotal}
												</span>
												<span className="text-slate-400">/</span>
												<span className="font-bold text-red-700">
													{nurse.nurseMax}
												</span>
											</div>
										</div>
									))}
									{solverValidation.nurseOverlimits.length > 6 && (
										<div className="py-1 font-medium text-red-600 text-xs">
											+ {solverValidation.nurseOverlimits.length - 6} more
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

			{/* WARNING: Shift deficits */}
			{shiftDeficits.length > 0 && (
				<div className="relative overflow-hidden rounded-xl border border-yellow-200 bg-yellow-50/80 p-4 shadow-sm">
					<div className="absolute top-0 bottom-0 left-0 w-1 bg-yellow-500" />
					<div className="flex items-start gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100">
							<Info className="h-5 w-5 text-yellow-600" />
						</div>
						<div className="min-w-0 flex-1">
							<h4 className="font-bold text-lg text-yellow-800">
								Insufficient Preference Coverage
							</h4>
							<p className="mt-1 text-sm text-yellow-700">
								Not enough nurses prefer these shifts. Solver will assign with
								lower satisfaction.
							</p>

							<div className="mt-3 flex flex-wrap gap-2">
								{shiftDeficits.map(({ shift, required, available, gap }) => (
									<div
										key={shift}
										className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-white/70 px-3 py-2"
									>
										<span className="font-medium text-yellow-900 capitalize">
											{shift}
										</span>
										<span className="text-xs text-yellow-700">
											{required} needed, {Math.max(0, available)} available
										</span>
										<span
											className={`rounded px-1.5 py-0.5 font-bold text-xs ${gap < 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
										>
											{gap < 0 ? gap : "+" + gap}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* SUCCESS: All checks pass */}
			{!solverValidation?.hasIssues &&
				infeasibleShifts.length === 0 &&
				tightShifts.length === 0 && (
					<div className="relative overflow-hidden rounded-xl border border-green-200 bg-green-50/80 p-4 shadow-sm">
						<div className="absolute top-0 bottom-0 left-0 w-1 bg-green-500" />
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
								<CheckCircle2 className="h-5 w-5 text-green-600" />
							</div>
							<div>
								<h4 className="font-bold text-green-800 text-lg">
									All Constraints Met
								</h4>
								<p className="mt-0.5 text-green-700 text-sm">
									Schedule generation should succeed with adequate capacity.
								</p>
							</div>
						</div>
					</div>
				)}
		</div>
	);
}
