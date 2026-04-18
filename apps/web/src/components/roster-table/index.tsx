import { useMemo, useRef } from "react";
import { useRosterDates, useRosterStore } from "../../store/use-roster-store";
import { buildShiftKey } from "../roster-matrix.utils";
import { LAYOUT } from "./constants";
import { DayHeaderCell } from "./day-header-cell";
import { NurseIdentityCell } from "./nurse-identity-cell";
import { NurseRow } from "./nurse-row";

export function RosterTable() {
	const { nurses, shifts, preferences } = useRosterStore();
	const monthDates = useRosterDates();
	const parentRef = useRef<HTMLDivElement>(null);

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
		<div className="relative flex h-screen flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
			{/* Scroll container */}
			<div
				ref={parentRef}
				className="scrollbar-hide min-h-0 flex-1 overflow-auto"
			>
				<table className="w-full table-fixed border-separate border-spacing-0">
					<thead>
						<tr>
							{/* Sticky first column header */}
							<th
								className="sticky top-0 left-0 z-[30] bg-[#f2f2f2] px-3 py-3 text-center"
								style={{
									width: LAYOUT.nameColWidth,
									height: LAYOUT.headerHeight,
									boxShadow: "inset -1px -1px 0 #e2e8f0", // Simulated bottom and right border
								}}
							>
								<span className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]">
									Nurses
								</span>
							</th>

							{normalizedDates.map((d, index) => (
								<th
									key={d.key}
									className="sticky top-0 z-[10] bg-[#f2f2f2]"
									style={{
										width: LAYOUT.cellWidth,
										height: LAYOUT.headerHeight,
										boxShadow: "inset -1px -1px 0 #e2e8f0", // Simulated bottom and right border
									}}
								>
									<DayHeaderCell date={d} counts={dayShiftCounts[index]} />
								</th>
							))}
						</tr>
					</thead>

					<tbody>
						{nurses.map((nurse) => (
							<tr key={nurse.id}>
								{/* Sticky first column */}
								<td
									className="sticky left-0 z-[20] bg-white text-center"
									style={{
										width: LAYOUT.nameColWidth,
										height: LAYOUT.cellHeight,
										boxShadow: "inset -1px -1px 0 #e2e8f0", // Simulated bottom and right border
									}}
								>
									<NurseIdentityCell
										nurse={nurse}
										counts={nurseShiftCounts.get(nurse.id)}
										pref={preferences[nurse.id]}
										totalDays={normalizedDates.length}
									/>
								</td>

								{/* Day cells */}
								{normalizedDates.map((d) => (
									<td
										key={`${nurse.id}-${d.key}`}
										className="bg-white"
										style={{
											width: LAYOUT.cellWidth,
											height: LAYOUT.cellHeight,
											boxShadow: "inset -1px -1px 0 #e2e8f0", // Simulated bottom and right border
										}}
									>
										<NurseRow nurse={nurse} dates={[d]} />
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
