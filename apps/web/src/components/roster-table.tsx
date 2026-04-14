import { User } from "lucide-react";
import { NURSES } from "./roster-matrix.constants";
import type { Shift, ShiftType } from "./roster-matrix.types";
import { buildShiftKey, DAYS, formatDate } from "./roster-matrix.utils";
import { ShiftBadge } from "./shift-badge";

/**
 * Layout constants (single source of truth)
 */
const LAYOUT = {
	nameColWidth: "200px",
	cellHeight: "80px",
	headerHeight: "58px",
};

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
	const isToday = (date: Date) =>
		date.toDateString() === new Date().toDateString();

	return (
		<div className="w-full bg-slate-200">
			<div
				className="grid bg-slate-200"
				style={{
					gridTemplateColumns: `${LAYOUT.nameColWidth} 1fr`,
				}}
			>
				{/* LEFT: NURSE NAMES */}
				<div className="bg-slate-100 dark:bg-slate-900">
					<table className="w-full table-fixed border-collapse">
						<thead>
							<tr>
								<th
									className="border border-slate-200 px-3 py-3 text-left font-bold text-sm uppercase dark:border-slate-700"
									style={{ height: LAYOUT.headerHeight }}
								>
									<div className="flex items-center gap-2">
										<User className="h-5 w-5" />
										Name
									</div>
								</th>
							</tr>
						</thead>

						<tbody>
							{NURSES.map((nurse) => (
								<tr key={nurse}>
									<td
										className="border border-slate-200 bg-white px-3 py-3 font-semibold text-sm dark:border-slate-700 dark:bg-slate-950"
										style={{ height: LAYOUT.cellHeight }}
									>
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

				{/* RIGHT: SCHEDULE GRID */}
				<div className="overflow-x-auto [webkit-overflow-scrolling:touch]">
					<table className="w-full min-w-[840px] table-fixed border-collapse">
						<thead>
							<tr>
								{weekDates.map((date, index) => (
									<th
										key={date.toISOString()}
										className={`border border-slate-200 text-center font-bold text-sm uppercase dark:border-slate-700 ${
											isToday(date)
												? "bg-slate-100"
												: "bg-slate-100 dark:bg-slate-900"
										}`}
										style={{ height: LAYOUT.headerHeight }}
									>
										<div className="flex flex-col items-center">
											<span>{DAYS[index]}</span>
											<span className="text-muted-foreground text-xs">
												{formatDate(date)}
											</span>
										</div>
									</th>
								))}
							</tr>
						</thead>

						<tbody>
							{NURSES.map((nurse) => (
								<tr key={nurse}>
									{weekDates.map((date) => {
										const shift = shiftMap.get(buildShiftKey(nurse, date));

										return (
											<td
												key={date.toISOString()}
												className={`border border-slate-200 text-center dark:border-slate-700 ${
													isToday(date)
														? "bg-slate-100"
														: "bg-white dark:bg-slate-950"
												}`}
												style={{ height: LAYOUT.cellHeight }}
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
