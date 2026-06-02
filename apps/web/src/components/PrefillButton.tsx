"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { usePrefillRoster } from "@/hooks/usePrefillRoster";

function PrefillAlerts({
	onConfirm,
	onCancel,
}: {
	onConfirm: () => void;
	onCancel: () => void;
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
				<div className="flex items-start gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
						<AlertCircle className="h-5 w-5 text-amber-600" />
					</div>
					<div className="flex-1">
						<h3 className="font-bold text-gray-900 text-lg">
							Prefill Schedule?
						</h3>
						<p className="mt-2 text-gray-600 text-sm">
							This will set default shift preferences based on nurse
							preferences.
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
					<Button onClick={onConfirm}>Set Default</Button>
				</div>
			</div>
		</div>
	);
}

export function PrefillButton({
	year,
	month,
}: {
	year: number;
	month: number;
}) {
	const [showDialog, setShowDialog] = useState(false);
	const { mutate } = usePrefillRoster();

	const handlePrefill = () => {
		mutate({ year, month });
		setShowDialog(false);
	};

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				className="border-amber-200 bg-amber-50/80 text-amber-600 transition-all hover:border-amber-300 hover:bg-amber-100 hover:text-amber-700"
				onClick={() => setShowDialog(true)}
			>
				Prefill Default
			</Button>
			{showDialog && (
				<PrefillAlerts
					onConfirm={handlePrefill}
					onCancel={() => setShowDialog(false)}
				/>
			)}
		</>
	);
}
