"use client";

import { Badge } from "@Duty-Roster/ui/components/badge";
import { Label } from "@Duty-Roster/ui/components/label";
import {
	Moon,
	Sun,
	Sunset,
	UserRoundCheck,
	UserRoundMinus,
	Users,
} from "lucide-react";
import { getNurseSummary } from "./useNurseSummary";

interface FormSummaryProps {
	nurses: any[];
	totalDays: number;
	capacity?: {
		morning: number;
		evening: number;
		night: number;
		total: number;
	};
}

export function FormSummary({ nurses, totalDays, capacity }: FormSummaryProps) {
	const summary = getNurseSummary(nurses, totalDays);

	return (
		<div className="flex w-full flex-col gap-2 sm:inline-flex sm:flex-row">
			<div className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5">
				<Label className="shrink-0">Availability</Label>
				<div className="flex gap-1">
					<Badge variant="default" className="gap-1">
						<Users className="h-3.5 w-3.5" />
						<span className="font-semibold">{summary.totalCount}</span>
					</Badge>
					<Badge variant="success" className="gap-1">
						<UserRoundCheck className="h-3.5 w-3.5" />
						<span className="font-semibold">{summary.activeCount}</span>
					</Badge>
					<Badge variant="inactive" className="gap-1">
						<UserRoundMinus className="h-3.5 w-3.5" />
						<span className="font-semibold">{summary.inactiveCount}</span>
					</Badge>
				</div>
			</div>

			<div className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5">
				<Label className="shrink-0">Capacity</Label>
				<div className="flex gap-1">
					<Badge variant="morning" className="gap-1">
						<Sun className="h-3.5 w-3.5" />
						<span className="font-semibold">
							{Math.round(capacity?.morning ?? 0)}
						</span>
					</Badge>
					<Badge variant="evening" className="gap-1">
						<Sunset className="h-3.5 w-3.5" />
						<span className="font-semibold">
							{Math.round(capacity?.evening ?? 0)}
						</span>
					</Badge>
					<Badge variant="night" className="gap-1">
						<Moon className="h-3.5 w-3.5" />
						<span className="font-semibold">
							{Math.round(capacity?.night ?? 0)}
						</span>
					</Badge>
				</div>
			</div>
		</div>
	);
}
