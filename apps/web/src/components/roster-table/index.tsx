import { useVirtualizer } from "@tanstack/react-virtual";
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

	const rowVirtualizer = useVirtualizer({
		count: nurses.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => LAYOUT.rowHeight,
		overscan: 10,
	});

	const totalGridWidth =
		normalizedDates.length * Number.parseInt(LAYOUT.cellWidth);

	return (
		<div
			className="relative flex flex-1 flex-col overflow-hidden rounded-xl border bg-white shadow-sm"
			style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}
		>
			<div ref={parentRef} className="flex-1 overflow-auto">
				<div
					className="relative"
					style={{
						height: `${rowVirtualizer.getTotalSize() + Number.parseInt(LAYOUT.headerHeight)}px`,
						minWidth: `calc(${LAYOUT.nameColWidth} + ${totalGridWidth}px)`,
					}}
				>
					{/* STICKY HEADER ROW */}
					<div
						className="sticky top-0 z-30 flex bg-white shadow-sm"
						style={{ height: LAYOUT.headerHeight }}
					>
						<div
							className="sticky left-0 z-40 flex items-center justify-center border-r border-b bg-slate-50 px-3 py-3 font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]"
							style={{
								flex: `0 0 ${LAYOUT.nameColWidth}`,
								width: LAYOUT.nameColWidth,
								height: LAYOUT.headerHeight,
							}}
						>
							Nurses
						</div>
						<div className="flex">
							{normalizedDates.map((d, index) => (
								<DayHeaderCell
									key={d.key}
									date={d}
									counts={dayShiftCounts[index]}
								/>
							))}
						</div>
					</div>

					{/* VIRTUALIZED BODY */}
					<div
						className="relative"
						style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
					>
						{rowVirtualizer.getVirtualItems().map((virtualRow) => {
							const nurse = nurses[virtualRow.index];
							return (
								<div
									key={nurse.id}
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										width: "100%",
										height: `${virtualRow.size}px`,
										transform: `translateY(${virtualRow.start}px)`,
										display: "flex",
									}}
								>
									<div
										className="sticky left-0 z-20 shrink-0 border-r bg-white shadow-[2px_0_5px_rgba(0,0,0,0.02)]"
										style={{
											flex: `0 0 ${LAYOUT.nameColWidth}`,
											width: LAYOUT.nameColWidth,
										}}
									>
										<NurseIdentityCell
											nurse={nurse}
											counts={nurseShiftCounts.get(nurse.id)}
											pref={preferences[nurse.id]}
											totalDays={normalizedDates.length}
										/>
									</div>
									<div className="flex">
										<NurseRow nurse={nurse} dates={normalizedDates} />
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
