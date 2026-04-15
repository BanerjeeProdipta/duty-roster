import React, { useCallback, useMemo } from "react";
import { NURSES } from "./roster-matrix.constants";
import type { Shift, ShiftType } from "./roster-matrix.types";
import { buildShiftKey, DAYS, formatDate } from "./roster-matrix.utils";
import { ShiftBadge } from "./shift-dropdown";

const LAYOUT = {
	nameColWidth: "180px",
	cellHeight: "80px",
	headerHeight: "52px",
};

/* -----------------------------
   MAIN TABLE
------------------------------ */

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
	const todayStr = useMemo(() => new Date().toDateString(), []);

	/* Normalize week once */
	const normalizedWeek = useMemo(() => {
		return weekDates.map((date, index) => {
			const isToday = date.toDateString() === todayStr;

			return {
				date,
				index,
				time: date.getTime(),
				isToday,
				label: DAYS[index],
				formatted: formatDate(date),
				shortLabel: date.toLocaleDateString("en-US", {
					weekday: "short",
					month: "short",
					day: "numeric",
				}),
				key: date.getTime(),
			};
		});
	}, [weekDates, todayStr]);

	/* Pre-index shiftMap for O(1) lookup */
	const shiftIndex = useMemo(() => {
		const map = new Map<string, Shift>();

		for (const [key, shift] of shiftMap.entries()) {
			map.set(key, shift);
		}

		return map;
	}, [shiftMap]);

	return (
		<div className="mb-12 flex flex-1 overflow-hidden">
			{/* LEFT NAME COLUMN */}
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

			{/* RIGHT GRID */}
			<div className="flex-1 overflow-x-auto">
				<table className="w-full min-w-[800px] table-fixed">
					<thead>
						<tr>
							{normalizedWeek.map((d) => (
								<th
									key={d.key}
									className={`border-b px-2 text-center font-semibold text-sm uppercase tracking-wide ${
										d.isToday ? "bg-primary/5" : ""
									}`}
									style={{ height: LAYOUT.headerHeight }}
								>
									<span className="block">{d.label}</span>
									<span className="block font-normal text-muted-foreground text-xs">
										{d.formatted}
									</span>
								</th>
							))}
						</tr>
					</thead>

					<tbody>
						{NURSES.map((nurse) => (
							<NurseRow
								key={nurse}
								nurse={nurse}
								week={normalizedWeek}
								shiftIndex={shiftIndex}
								editable={editable}
								onShiftChange={onShiftChange}
							/>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

/* -----------------------------
   MEMOIZED ROW
------------------------------ */

interface NurseRowProps {
	nurse: string;
	week: {
		date: Date;
		key: number;
		isToday: boolean;
		shortLabel: string;
		formatted: string;
		label: string;
	}[];
	shiftIndex: Map<string, Shift>;
	editable: boolean;
	onShiftChange: (nurse: string, date: Date, shiftType: ShiftType) => void;
}

const NurseRow = React.memo(function NurseRow({
	nurse,
	week,
	shiftIndex,
	editable,
	onShiftChange,
}: NurseRowProps) {
	const handleChange = useCallback(
		(date: Date) => (newType: ShiftType) => {
			onShiftChange(nurse, date, newType);
		},
		[nurse, onShiftChange],
	);

	return (
		<tr>
			{week.map((d) => {
				const shift = shiftIndex.get(buildShiftKey(nurse, d.date));

				return (
					<td
						key={d.key}
						className={`border-r border-b text-center ${
							d.isToday ? "bg-primary/5" : ""
						}`}
						style={{ height: LAYOUT.cellHeight }}
					>
						{shift && (
							<ShiftBadge
								type={shift.shiftType}
								nurseName={nurse}
								date={d.shortLabel}
								onChange={editable ? handleChange(d.date) : undefined}
							/>
						)}
					</td>
				);
			})}
		</tr>
	);
});
