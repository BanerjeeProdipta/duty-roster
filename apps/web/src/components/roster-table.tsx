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
		<div className="w-full">
			<div className="grid grid-cols-[160px_1fr]">
				<div className="border-r bg-slate-100 dark:bg-slate-900">
					<table className="w-full table-fixed border-collapse">
						<thead>
							<tr>
								<th className="h-[58px] px-3 py-3 text-left font-bold text-sm uppercase">
									<div className="flex items-center gap-2">
										<User className="h-5 w-5" />
										Name
									</div>
								</th>
							</tr>
						</thead>
						<tbody>
							{NURSES.map((nurse) => (
								<tr key={`name-${nurse}`} className="border-t">
									<td className="h-[84px] bg-white px-3 py-3 font-semibold text-sm dark:bg-slate-950">
										<div className="flex items-center gap-2">
											<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-bold text-white text-xs">
												{nurse
													.split(" ")
													.map((n) => n[0])
													.join("")}
											</div>
											<span className="truncate">{nurse}</span>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="overflow-x-auto [webkit-overflow-scrolling:touch]">
					<table className="w-full min-w-[840px] table-fixed border-collapse">
						<thead>
							<tr>
								{weekDates.map((date, index) => {
									const isToday =
										date.toDateString() === new Date().toDateString();
									return (
										<th
											key={date.toISOString()}
											className={`whitespace-nowrap border-l px-2 py-3 text-center font-bold text-sm uppercase ${
												isToday
													? "bg-primary/20"
													: "bg-slate-100 dark:bg-slate-900"
											}`}
										>
											<div className="flex flex-col items-center">
												<span>{DAYS[index]}</span>
												<span className="text-muted-foreground text-xs">
													{formatDate(date)}
												</span>
											</div>
										</th>
									);
								})}
							</tr>
						</thead>
						<tbody>
							{NURSES.map((nurse) => (
								<tr key={`week-${nurse}`} className="border-t">
									{weekDates.map((date) => {
										const shift = shiftMap.get(buildShiftKey(nurse, date));
										const isToday =
											date.toDateString() === new Date().toDateString();
										return (
											<td
												key={date.toISOString()}
												className={`h-[84px] whitespace-nowrap border-l px-1 py-2 text-center ${
													isToday ? "bg-primary/10" : ""
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
																? (newType) =>
																		onShiftChange(nurse, date, newType)
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
			</div>
		</div>
	);
}
