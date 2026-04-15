import { Button } from "@Duty-Roster/ui/components/button";
import { CardHeader, CardTitle } from "@Duty-Roster/ui/components/card";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

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
		<CardHeader className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
			<div className="flex items-center gap-4">
				<div className="flex flex-col gap-1">
					<CardTitle className="font-bold text-xl tracking-tight sm:text-2xl">
						Weekly Duty Roster
					</CardTitle>
				</div>
			</div>
			<div className="flex flex-col justify-center gap-4 sm:flex-row sm:items-center">
				<Button
					variant="outline"
					size="sm"
					className="h-12 gap-2 rounded-md px-4 font-semibold text-slate-600 sm:h-15 sm:px-3 sm:text-base"
					onClick={onCurrentWeek}
				>
					<Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
					<p>
						<span className="pr-2">Today</span>
						<span className="border-l pl-2">
							{new Date().toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
							})}
						</span>
					</p>
				</Button>
				<div className="grid w-full min-w-66 grid-cols-[auto_1fr_auto] items-center justify-between gap-1 rounded-lg border p-1 sm:w-max">
					<Button
						variant="ghost"
						size="sm"
						className="h-10 w-10 rounded-md sm:h-12 sm:w-12"
						onClick={onPreviousWeek}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<div className="flex min-w-0 items-center justify-center gap-1 sm:gap-2">
						<span className="truncate px-1 text-center font-semibold text-sm sm:px-3 sm:text-base">
							{weekDates[0].toLocaleDateString("en-US", { month: "short" })}{" "}
							{weekDates[0].getDate()} -{" "}
							{weekDates[6].toLocaleDateString("en-US", { month: "short" })}{" "}
							{weekDates[6].getDate()}
						</span>
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="h-10 w-10 rounded-md sm:h-12 sm:w-12"
						onClick={onNextWeek}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</CardHeader>
	);
}
