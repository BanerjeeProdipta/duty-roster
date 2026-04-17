import React, { useCallback, useMemo } from "react";
import type { Shift, ShiftType } from "./roster-matrix.types";
import { buildShiftKey } from "./roster-matrix.utils";
import { ShiftBadge } from "./shift-dropdown";

const LAYOUT = {
	nameColWidth: "180px",
	cellHeight: "90px",
	headerHeight: "56px",
};

/* -----------------------------
   MAIN TABLE
------------------------------ */

interface RosterTableProps {
	nurses: {
		id: string;
		name: string;
	}[];
	weekDates: Date[];
	shiftMap: Map<string, Shift>;
	editable: boolean;
	onShiftChange: (nurseName: string, date: Date, shiftType: ShiftType) => void;
}

export function RosterTable({
	nurses,
	weekDates,
	shiftMap,
	editable,
	onShiftChange,
}: RosterTableProps) {
	const todayStr = useMemo(() => new Date().toDateString(), []);

	/* Normalize dates for the month */
	const normalizedDates = useMemo(() => {
		return weekDates.map((date) => {
			const isToday = date.toDateString() === todayStr;
			const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "short" });

			return {
				date,
				time: date.getTime(),
				isToday,
				label: dayOfWeek,
				formatted: date.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
				}),
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
						{nurses.map((nurse) => (
							<tr key={nurse.id}>
								<td
									className="border-r border-b bg-muted/30 px-4 py-3"
									style={{ height: LAYOUT.cellHeight }}
								>
									<span className="font-medium text-base">{nurse.name}</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* RIGHT GRID - Scrollable */}
			<div className="flex-1 overflow-x-auto">
				<table
					className="table-fixed"
					style={{ minWidth: `${normalizedDates.length * 100}px` }}
				>
					<thead>
						<tr>
							{normalizedDates.map((d) => (
								<th
									key={d.key}
									className={`border-b px-1 text-center font-semibold text-xs uppercase tracking-wide ${
										d.isToday ? "bg-primary/10" : ""
									}`}
									style={{ height: LAYOUT.headerHeight, minWidth: "100px" }}
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
						{nurses.map((nurse) => (
							<NurseRow
								key={nurse.id}
								nurse={nurse}
								dates={normalizedDates}
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
	nurse: {
		id: string;
		name: string;
	};
	dates: {
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
	dates,
	shiftIndex,
	editable,
	onShiftChange,
}: NurseRowProps) {
	const handleChange = useCallback(
		(date: Date) => (newType: ShiftType) => {
			onShiftChange(nurse.name, date, newType);
		},
		[nurse, onShiftChange],
	);

	return (
		<tr>
			{dates.map((d) => {
				const shift = shiftIndex.get(buildShiftKey(nurse.name, d.date));

				return (
					<td
						key={d.key}
						className={`border-r border-b text-center ${
							d.isToday ? "bg-primary/5" : ""
						}`}
						style={{ height: LAYOUT.cellHeight, minWidth: "100px" }}
					>
						{shift && (
							<ShiftBadge
								type={shift.shiftType}
								nurseName={nurse.name}
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
