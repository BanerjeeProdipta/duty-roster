"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { usePrefillRoster } from "@/hooks/usePrefillRoster";

interface PrefillAlertsProps {
	onConfirm: () => void;
	onCancel: () => void;
	mode: "fairly" | "minimize" | "maximize";
}

function PrefillAlerts({ onConfirm, onCancel, mode }: PrefillAlertsProps) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
				<div className="flex items-start gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
						<AlertCircle className="h-5 w-5 text-amber-600" />
					</div>
					<div className="flex-1">
						<h3 className="font-bold text-lg text-slate-900">
							Prefill Schedule?
						</h3>
						<p className="mt-2 text-slate-600 text-sm">
							This will{" "}
							{mode === "fairly"
								? "distribute shifts fairly"
								: mode === "minimize"
									? "minimize shift assignments"
									: "maximize shift assignments"}{" "}
							based on nurse preferences.
						</p>
					</div>
				</div>

				<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
					<div className="flex items-start gap-2">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
						<p className="text-amber-800 text-xs">
							This will overwrite any existing assignments for this month. Make
							sure to save your current schedule first.
						</p>
					</div>
				</div>

				<div className="mt-6 flex justify-end gap-3">
					<Button variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button onClick={onConfirm}>
						{mode === "fairly" && "Prefill Fairly"}
						{mode === "minimize" && "Minimize Shifts"}
						{mode === "maximize" && "Maximize Shifts"}
					</Button>
				</div>
			</div>
		</div>
	);
}

export function PrefillButton({
	year,
	month,
	mode,
}: {
	year: number;
	month: number;
	mode: "fairly" | "minimize" | "maximize";
}) {
	const [showDialog, setShowDialog] = useState(false);
	const { mutate } = usePrefillRoster(mode);

	const handlePrefill = () => {
		mutate({ year, month });
		setShowDialog(false);
	};

	return (
		<>
			<Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
				{mode === "fairly" && "Prefill Fairly"}
				{mode === "minimize" && "Minimize Shifts"}
				{mode === "maximize" && "Maximize Shifts"}
			</Button>
			{showDialog && (
				<PrefillAlerts
					onConfirm={handlePrefill}
					onCancel={() => setShowDialog(false)}
					mode={mode}
				/>
			)}
		</>
	);
}
