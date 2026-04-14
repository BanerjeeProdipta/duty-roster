import { User } from "lucide-react";
import { NURSES } from "./roster-matrix.constants";
import type { Shift, ShiftType } from "./roster-matrix.types";
import { buildShiftKey, DAYS, formatDate } from "./roster-matrix.utils";
import { ShiftBadge } from "./shift-badge";

interface RosterTableProps {
	weekDates: Date[];
	shiftMap: Map<string, Shift>;
	editable: boolean;
	onShiftChange: (nurseName: string, date: Date, shiftType: ShiftType) => void;
}

export function RosterTable({
	weekDates,
	shiftMap,
	editable,
	onShiftChange,
}: RosterTableProps) {
	return (
		<div className="relative w-full overflow-x-auto">
			<table className="w-max min-w-[900px] min-w-full">
				<thead>
					<tr>
						<th className="sticky left-0 z-30 w-[200px] min-w-[200px] border-r bg-slate-50 py-4 pr-4 pl-5 text-left font-bold text-lg text-muted-foreground uppercase tracking-wide dark:bg-slate-900">
							<div className="flex items-center gap-2">
								<User className="h-8 w-8" />
								<span className="text-lg">Name</span>
							</div>
						</th>
						{weekDates.map((date, index) => {
							const isToday = date.toDateString() === new Date().toDateString();
							return (
								<th
									key={date.toISOString()}
									className={`min-w-[100px] border-l py-4 text-center font-bold text-lg uppercase tracking-wide ${
										isToday
											? "bg-primary/10 dark:bg-primary/20"
											: "bg-slate-50/95 dark:bg-slate-900/95"
									}`}
								>
									<div className="flex flex-col items-center gap-0.5">
										<span
											className={`text-lg ${
												isToday ? "font-bold text-primary" : "text-foreground"
											}`}
										>
											{DAYS[index]}
										</span>
										<span className="font-medium text-md text-muted-foreground">
											{formatDate(date)}
										</span>
									</div>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{NURSES.map((nurse, rowIndex) => (
						<tr
							key={nurse}
							className={`group border-b transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/40 ${
								rowIndex % 2 === 0
									? "bg-white dark:bg-background"
									: "bg-slate-50/30 dark:bg-slate-900/20"
							}`}
						>
							<td className="sticky left-0 z-20 w-[200px] min-w-[200px] border-r bg-white py-3 pr-4 pl-5 font-semibold text-base tracking-wide dark:bg-slate-950">
								<div className="flex items-center gap-3">
									<div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary font-bold text-primary-foreground text-xs">
										{nurse
											.split(" ")
											.map((name) => name[0])
											.join("")}
									</div>
									<span className="truncate">{nurse}</span>
								</div>
							</td>
							{weekDates.map((date) => {
								const shift = shiftMap.get(buildShiftKey(nurse, date));
								const isToday =
									date.toDateString() === new Date().toDateString();

								return (
									<td
										key={date.toISOString()}
										className={`border-l p-2 text-center transition-colors ${
											isToday ? "bg-primary/5" : ""
										}`}
									>
										{shift && (
											<ShiftBadge
												type={shift.shiftType}
												nurseName={nurse}
												date={date.toLocaleDateString("en-US", {
													weekday: "short",
													month: "short",
													day: "numeric",
												})}
												onChange={
													editable
														? (newType) => onShiftChange(nurse, date, newType)
														: undefined
												}
											/>
										)}
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
