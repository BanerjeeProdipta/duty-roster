"use client";
import { useMemo } from "react";
import { useRosterDates, useRosterStore } from "../../store/use-roster-store";
import { buildShiftKey } from "../roster-matrix.utils";
import { LAYOUT } from "./constants";
import { DayHeaderCell } from "./day-header-cell";
import { NurseIdentityCell } from "./nurse-identity-cell";
import { NurseRow } from "./nurse-row";

export function RosterTable() {
	const { nurses, shifts, preferences } = useRosterStore();
	const monthDates = useRosterDates();

	const weekDates = useMemo(
		() => monthDates.map((d) => new Date(`${d}T12:00:00Z`)),
		[monthDates],
	);

	const todayStr = useMemo(() => new Date().toDateString(), []);

	const shiftMap = useMemo(() => {
		const map = new Map();
		shifts.forEach((s) => {
			map.set(buildShiftKey(s.employeeName, s.date), s);
		});
		return map;
	}, [shifts]);

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

	const nurseShiftCounts = useMemo(() => {
		const counts = new Map();
		nurses.forEach((nurse) => {
			let morning = 0;
			let evening = 0;
			let night = 0;
			weekDates.forEach((date) => {
				const shift = shiftMap.get(buildShiftKey(nurse.name, date));
				if (shift?.shiftType === "morning") morning++;
				else if (shift?.shiftType === "evening") evening++;
				else if (shift?.shiftType === "night") night++;
			});
			counts.set(nurse.id, { morning, evening, night });
		});
		return counts;
	}, [nurses, weekDates, shiftMap]);

	const dayShiftCounts = useMemo(() => {
		return weekDates.map((date) => {
			let morning = 0;
			let evening = 0;
			let night = 0;
			nurses.forEach((nurse) => {
				const shift = shiftMap.get(buildShiftKey(nurse.name, date));
				if (shift?.shiftType === "morning") morning++;
				else if (shift?.shiftType === "evening") evening++;
				else if (shift?.shiftType === "night") night++;
			});
			return { morning, evening, night };
		});
	}, [nurses, weekDates, shiftMap]);

	return (
		<div className="flex flex-1 overflow-hidden rounded-xl border bg-white shadow-sm">
			{/* LEFT NAME COLUMN */}
			<div
				className="z-10 flex shrink-0"
				style={{ width: LAYOUT.nameColWidth }}
			>
				<table className="w-full table-fixed border-collapse">
					<thead>
						<tr>
							<th
								className="border-r border-b bg-slate-50 py-3 text-center font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]"
								style={{ height: LAYOUT.headerHeight }}
							>
								Nurses
							</th>
						</tr>
					</thead>
					<tbody>
						{nurses.map((nurse) => (
							<tr key={nurse.id}>
								<NurseIdentityCell
									nurse={nurse}
									counts={nurseShiftCounts.get(nurse.id)}
									pref={preferences[nurse.id]}
									totalDays={normalizedDates.length}
								/>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* RIGHT GRID - Scrollable */}
			<div className="flex-1 overflow-x-auto">
				<table
					className="table-fixed border-collapse"
					style={{ minWidth: `${normalizedDates.length * 120}px` }}
				>
					<thead>
						<tr>
							{normalizedDates.map((d, index) => (
								<DayHeaderCell
									key={d.key}
									date={d}
									counts={dayShiftCounts[index]}
								/>
							))}
						</tr>
					</thead>

					<tbody>
						{nurses.map((nurse) => (
							<NurseRow key={nurse.id} nurse={nurse} dates={normalizedDates} />
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
