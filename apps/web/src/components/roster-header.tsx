import { Button } from "@Duty-Roster/ui/components/button";
import { CardHeader, CardTitle } from "@Duty-Roster/ui/components/card";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface RosterHeaderProps {
	nurseCount: number;
	weekDates: Date[];
	setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
}

export function RosterHeader({
	nurseCount,
	weekDates,
	setWeekOffset,
}: RosterHeaderProps) {
	return (
		<CardHeader className="flex flex-row items-center justify-between border-b pb-4">
			<div className="flex items-center gap-4">
				<div className="flex flex-col gap-1">
					<CardTitle className="font-bold text-2xl tracking-tight">
						Weekly Duty Roster
					</CardTitle>
					<p className="text-lg text-muted-foreground">
						{nurseCount} nurses ·{" "}
						{weekDates[0].toLocaleDateString("en-US", {
							month: "long",
							year: "numeric",
						})}
					</p>
				</div>
			</div>
			<div className="flex w-full min-w-60 max-w-100 items-center justify-between gap-1 rounded-lg border p-1">
				<Button
					variant="ghost"
					size="sm"
					className="h-12 w-12 rounded-md"
					onClick={() => setWeekOffset((o) => o - 1)}
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="h-12 gap-3 rounded-md border-dashed px-3 font-semibold text-lg"
					onClick={() => setWeekOffset(0)}
				>
					<Calendar className="h-12 w-12" size={12} />
					<p>Today</p>
				</Button>
				<span className="min-w-[160px] px-3 text-center font-semibold text-xl">
					{weekDates[0].toLocaleDateString("en-US", { month: "short" })}{" "}
					{weekDates[0].getDate()} -{" "}
					{weekDates[6].toLocaleDateString("en-US", { month: "short" })}{" "}
					{weekDates[6].getDate()}
				</span>
				<Button
					variant="ghost"
					size="sm"
					className="h-9 w-9 rounded-md"
					onClick={() => setWeekOffset((o) => o + 1)}
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</CardHeader>
	);
}
