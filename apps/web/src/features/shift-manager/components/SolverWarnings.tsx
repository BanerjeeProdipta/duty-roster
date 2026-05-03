"use client";

import { AlertTriangle, Info } from "lucide-react";
import type {
	ShiftDeficit,
	SolverValidation,
} from "../hooks/useSolverValidation";

interface SolverWarningsProps {
	solverValidation: SolverValidation;
	totalDays: number;
	shiftDeficits: ShiftDeficit[];
	showExactMatchWarning: boolean;
}

export function SolverWarnings({
	solverValidation,
	totalDays,
	shiftDeficits,
	showExactMatchWarning,
}: SolverWarningsProps) {
	if (!solverValidation?.hasIssues && !showExactMatchWarning) return null;

	return (
		<>
			{solverValidation?.hasIssues && (
				<div className="flex items-start gap-3 rounded-lg border border-red-400 bg-red-50 p-4">
					<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5">
							<h4 className="font-semibold text-red-800">
								Roster cannot be generated — solver constraints not met
							</h4>
							{/* <InfoTooltip
                title="Why is this happening?"
                content={
                  <>
                    <p>
                      Each nurse can work at most{" "}
                      <span className="font-bold">
                        {solverValidation?.baseMaxShifts} shifts
                      </span>{" "}
                      per month:
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      <li>
                        • {totalDays} days - {solverValidation?.weeksInMonth}{" "}
                        off days (1 per week) ={" "}
                        {solverValidation?.baseMaxShifts}
                      </li>
                      <li>
                        • Night off: 2 consecutive nights → 1 extra off day
                        after
                      </li>
                      <li>• 3 nights in a row not allowed (max 2 consecutive)</li>
                      <li>• Single night shifts get no night off</li>
                    </ul>
                  </>
                }
              /> */}
						</div>

						{solverValidation.totalCapacity <
							solverValidation.totalRequired && (
							<div className="mt-2 rounded-md bg-white/60 p-2">
								<p className="font-medium text-red-800 text-xs">
									⚠ Not enough nurses for total shifts needed
								</p>
								<p className="mt-0.5 text-red-700 text-xs">
									You need{" "}
									<span className="font-bold">
										{solverValidation.totalRequired} shifts
									</span>{" "}
									but only have{" "}
									<span className="font-bold">
										{solverValidation.totalCapacity} possible shifts
									</span>{" "}
									({solverValidation.activeNurseCount} nurses ×{" "}
									{solverValidation.baseMaxShifts} max shifts each: {totalDays}{" "}
									days - {solverValidation.weeksInMonth} off days (1/week)).
									<span className="mt-0.5 block text-red-600">
										→ Add more nurses. At least{" "}
										<span className="font-bold">
											{Math.ceil(
												(solverValidation.totalRequired -
													solverValidation.totalCapacity) /
													solverValidation.baseMaxShifts,
											)}{" "}
											more.
										</span>
									</span>
								</p>
							</div>
						)}

						{solverValidation.nurseOverlimits.length > 0 && (
							<div className="mt-2 rounded-md bg-white/60 p-2">
								<p className="font-medium text-red-800 text-xs">
									⚠ Some nurses want too many shifts
								</p>
								<p className="mt-0.5 text-red-700 text-xs">
									Max shifts per nurse = {solverValidation.baseMaxShifts} (based
									on 1 off day per week):
								</p>
								<ul className="mt-1 space-y-0.5">
									{solverValidation.nurseOverlimits.map((nurse) => (
										<li key={nurse.name} className="text-red-700 text-xs">
											• <span className="font-medium">{nurse.name}</span>:{" "}
											<span className="font-bold">
												{nurse.assignableTotal} assignable
											</span>{" "}
											shifts, but max is {nurse.nurseMax}
											<span className="ml-3 block text-red-600">
												→ Reduce their total shift preferences (night:{" "}
												{nurse.nightShifts}, max 2 consecutive)
											</span>
										</li>
									))}
								</ul>
							</div>
						)}

						{shiftDeficits.length > 0 && (
							<div className="mt-2 rounded-md bg-white/60 p-2">
								<p className="font-medium text-red-800 text-xs">
									⚠ Not enough nurses want these shifts
								</p>
								<p className="mt-0.5 text-red-700 text-xs">
									Increase preference for these shifts:
								</p>
								<ul className="mt-1 flex flex-wrap gap-1.5">
									{shiftDeficits.map(({ shift, required, available, gap }) => (
										<li
											key={shift}
											className="inline-flex items-center gap-1 rounded border border-red-300 bg-white/40 px-2 py-0.5 font-medium text-red-900 text-xs"
										>
											<span className="capitalize">{shift}</span>: need{" "}
											{required}, have {Math.max(0, available)}
											<span className="font-bold text-red-600">({gap})</span>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>
			)}
		</>
	);
}

// ──────────── Inline: InfoTooltip ────────────

function InfoTooltip({
	title,
	content,
}: {
	title: string;
	content: React.ReactNode;
}) {
	return (
		<div className="group relative">
			<Info className="h-4 w-4 cursor-help text-slate-500" />
			<div className="absolute left-1/2 z-10 mt-2 w-72 -translate-x-1/2 rounded-md bg-slate-800 p-2.5 text-white text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
				<p className="font-medium text-rose-300">{title}</p>
				<div className="mt-1">{content}</div>
				<div className="absolute -top-1 left-1/2 -translate-x-1/2 border-r-4 border-r-transparent border-b-4 border-b-slate-800 border-l-4 border-l-transparent" />
			</div>
		</div>
	);
}
