import { NURSES } from "./roster-matrix.constants";
import type { Shift, ShiftType } from "./roster-matrix.types";
import { buildShiftKey, DAYS, formatDate } from "./roster-matrix.utils";
import { ShiftBadge } from "./shift-dropdown";

const LAYOUT = {
	nameColWidth: "180px",
	cellHeight: "80px",
	headerHeight: "52px",
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
		<div className="mb-12 flex flex-1 overflow-hidden">
			<div className="flex shrink-0" style={{ width: LAYOUT.nameColWidth }}>
				<table className="w-full table-fixed">
					<thead>
						<tr>
							<th
								className="border-r border-b px-4 py-3 text-left font-semibold text-sm uppercase tracking-wide"
								style={{ height: LAYOUT.headerHeight }}
							>
								Name
							</th>
						</tr>
					</thead>
					<tbody>
						{NURSES.map((nurse) => (
							<tr key={nurse}>
								<td
									className="border-r border-b bg-muted/30 px-4 py-3"
									style={{ height: LAYOUT.cellHeight }}
								>
									<span className="font-medium text-base">{nurse}</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className="flex-1 overflow-x-auto">
				<table className="w-full min-w-[800px] table-fixed">
					<thead>
						<tr>
							{weekDates.map((date, index) => (
								<th
									key={date.toISOString()}
									className={`border-b px-2 text-center font-semibold text-sm uppercase tracking-wide ${
										isToday(date) ? "bg-primary/5" : ""
									}`}
									style={{ height: LAYOUT.headerHeight }}
								>
									<span className="block">{DAYS[index]}</span>
									<span className="block font-normal text-muted-foreground text-xs">
										{formatDate(date)}
									</span>
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
											className={`border-r border-b text-center ${
												isToday(date) ? "bg-primary/5" : ""
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
		</div>
	);
}
