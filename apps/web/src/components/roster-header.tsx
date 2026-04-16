import { Button } from "@Duty-Roster/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RosterHeaderProps {
	nurseCount: number;
	weekDates: Date[];
	onPreviousWeek: () => void;
	onNextWeek: () => void;
	onCurrentWeek: () => void;
}

export function RosterHeader({
	nurseCount,
	weekDates,
	onPreviousWeek,
	onNextWeek,
	onCurrentWeek,
}: RosterHeaderProps) {
	return (
		<div className="flex flex-col gap-4 border-b px-4 py-6 lg:flex-row lg:items-center lg:justify-between">
			<h1 className="font-bold text-lg tracking-tight lg:text-xl">
				Weekly Schedule
			</h1>
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="sm"
					className="text-base"
					onClick={onCurrentWeek}
				>
					Today
				</Button>
				<div className="flex items-center gap-2 rounded-md border">
					<Button variant="ghost" size="icon" onClick={onPreviousWeek}>
						<ChevronLeft className="h-5 w-5" />
					</Button>
					<span className="min-w-40 text-center font-medium text-base">
						{weekDates[0].toLocaleDateString("en-US", { month: "short" })}{" "}
						{weekDates[0].getDate()} -{" "}
						{weekDates[6].toLocaleDateString("en-US", { month: "short" })}{" "}
						{weekDates[6].getDate()}
					</span>
					<Button variant="ghost" size="icon" onClick={onNextWeek}>
						<ChevronRight className="h-5 w-5" />
					</Button>
				</div>
			</div>
		</div>
	);
}
