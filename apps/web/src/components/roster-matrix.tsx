"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@Duty-Roster/ui/components/card";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Coffee,
	Moon,
	Sun,
	Sunset,
	User,
} from "lucide-react";
import { useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ShiftType = "morning" | "evening" | "night" | "off";

interface Shift {
	id: string;
	employeeId: string;
	employeeName: string;
	date: string;
	shiftType: ShiftType;
}

const NURSES = [
	"Emma Wilson",
	"Liam Johnson",
	"Olivia Brown",
	"Noah Davis",
	"Ava Miller",
	"Oliver Garcia",
	"Elijah Martinez",
	"Sophia Anderson",
	"Lucas Thomas",
	"Isabella Jackson",
	"Mason White",
	"Mia Harris",
	"Ethan Martin",
	"Charlotte Thompson",
	"Alexander Moore",
	"Amelia Taylor",
	"James Clark",
	"Harper Lewis",
	"Benjamin Walker",
	"Evelyn Hall",
	"Henry Young",
	"Abigail King",
	"Sebastian Wright",
	"Emily Scott",
	"Jack Green",
	"Elizabeth Baker",
	"Daniel Adams",
	"Sofia Nelson",
	"Matthew Hill",
	"Avery Campbell",
];

interface ShiftBadgeProps {
	type: ShiftType;
}

function ShiftBadge({ type }: ShiftBadgeProps) {
	const styles: Record<ShiftType, string> = {
		morning:
			"bg-gradient-to-br from-amber-400 to-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/25",
		evening:
			"bg-gradient-to-br from-indigo-400 to-indigo-500 text-white border-indigo-600 shadow-md shadow-indigo-500/25",
		night:
			"bg-gradient-to-br from-slate-500 to-slate-600 text-white border-slate-700 shadow-md shadow-slate-500/25",
		off: "bg-slate-100 text-slate-400 border-slate-200",
	};

	const icons: Record<ShiftType, React.ReactNode> = {
		morning: <Sun className="h-5 w-5" />,
		evening: <Sunset className="h-5 w-5" />,
		night: <Moon className="h-5 w-5" />,
		off: <Coffee className="h-5 w-5" />,
	};

	const labels: Record<ShiftType, string> = {
		morning: "Morning",
		evening: "Evening",
		night: "Night",
		off: "Off",
	};

	return (
		<div
			className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border font-bold text-sm shadow-sm transition-all hover:scale-110 hover:shadow-lg ${styles[type]}`}
			title={labels[type]}
		>
			{icons[type]}
		</div>
	);
}

function Legend() {
	const items: { type: ShiftType; label: string; icon: React.ReactNode }[] = [
		{
			type: "morning",
			label: "Morning (8AM - 4PM)",
			icon: <Sun className="h-4 w-4" />,
		},
		{
			type: "evening",
			label: "Evening (4PM - 12AM)",
			icon: <Sunset className="h-4 w-4" />,
		},
		{
			type: "night",
			label: "Night (12AM - 8AM)",
			icon: <Moon className="h-4 w-4" />,
		},
		{ type: "off", label: "Day Off", icon: <Coffee className="h-4 w-4" /> },
	];

	const colors: Record<ShiftType, string> = {
		morning: "bg-amber-400",
		evening: "bg-indigo-400",
		night: "bg-slate-500",
		off: "bg-slate-200",
	};

	return (
		<div className="flex flex-wrap items-center justify-center gap-4 rounded-lg border bg-slate-50 p-3 dark:bg-slate-900/50">
			<span className="font-medium text-muted-foreground text-sm">Legend:</span>
			{items.map((item) => (
				<div key={item.type} className="flex items-center gap-2">
					<div className={`h-3 w-3 rounded-full ${colors[item.type]}`} />
					<span className="font-medium text-foreground text-xs">
						{item.label}
					</span>
				</div>
			))}
		</div>
	);
}

function generateShifts(weekDates: Date[]): Shift[] {
	const shifts: Shift[] = [];
	let shiftId = 0;

	weekDates.forEach((_, dayIndex) => {
		// Morning shifts
		for (let i = 0; i < 20; i++) {
			shifts.push({
				id: `${shiftId++}`,
				employeeId: `n${i}`,
				employeeName: NURSES[i],
				date: weekDates[dayIndex].toISOString().split("T")[0],
				shiftType: "morning",
			});
		}
		// Evening shifts
		for (let i = 0; i < 3; i++) {
			shifts.push({
				id: `${shiftId++}`,
				employeeId: `n${20 + i}`,
				employeeName: NURSES[20 + i],
				date: weekDates[dayIndex].toISOString().split("T")[0],
				shiftType: "evening",
			});
		}
		// Night shifts
		for (let i = 0; i < 2; i++) {
			shifts.push({
				id: `${shiftId++}`,
				employeeId: `n${23 + i}`,
				employeeName: NURSES[23 + i],
				date: weekDates[dayIndex].toISOString().split("T")[0],
				shiftType: "night",
			});
		}
		// Some off days
		for (let i = 0; i < 5; i++) {
			shifts.push({
				id: `${shiftId++}`,
				employeeId: `n${25 + i}`,
				employeeName: NURSES[25 + i],
				date: weekDates[dayIndex].toISOString().split("T")[0],
				shiftType: "off",
			});
		}
	});

	return shifts;
}

function getWeekDates(offset: number): Date[] {
	const today = new Date();
	const startOfWeek = new Date(today);
	startOfWeek.setDate(today.getDate() - today.getDay() + 1 + offset * 7);
	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(startOfWeek);
		d.setDate(startOfWeek.getDate() + i);
		return d;
	});
}

function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RosterMatrix() {
	const [weekOffset, setWeekOffset] = useState(0);
	const weekDates = getWeekDates(weekOffset);
	const shifts = generateShifts(weekDates);

	const getShiftForNurseAndDate = (
		nurseName: string,
		date: Date,
	): Shift | undefined => {
		const dateStr = date.toISOString().split("T")[0];
		return shifts.find(
			(s) => s.employeeName === nurseName && s.date === dateStr,
		);
	};

	return (
		<div className="flex flex-col gap-6">
			<Legend />
			<Card className="w-full overflow-hidden">
				<CardHeader className="flex flex-row items-center justify-between border-b pb-4">
					<div className="flex flex-col gap-1">
						<CardTitle className="font-bold text-xl tracking-tight">
							Weekly Duty Roster
						</CardTitle>
						<p className="text-muted-foreground text-sm">
							{nurseCount} nurses ·{" "}
							{weekDates[0].toLocaleDateString("en-US", {
								month: "long",
								year: "numeric",
							})}
						</p>
					</div>
					<div className="flex items-center gap-1 rounded-lg border p-1">
						<Button
							variant="ghost"
							size="sm"
							className="h-9 w-9 rounded-md"
							onClick={() => setWeekOffset((o) => o - 1)}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="h-9 gap-3 rounded-md border-dashed px-3 font-semibold text-sm"
							onClick={() => setWeekOffset(0)}
						>
							<Calendar className="h-3 w-3" />
							<p>Today</p>
						</Button>
						<span className="min-w-[160px] px-3 text-center font-semibold text-sm">
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
				<CardContent className="overflow-x-auto p-0">
					<table className="w-full min-w-[900px]">
						<thead>
							<tr>
								<th className="sticky left-0 z-20 w-[200px] min-w-[200px] border-r bg-slate-50/95 py-4 pr-4 pl-5 text-left font-bold text-muted-foreground text-sm uppercase tracking-wide backdrop-blur-sm dark:bg-slate-900/95">
									<div className="flex items-center gap-2">
										<User className="h-4 w-4" />
										<span className="text-xs"> Name</span>
									</div>
								</th>
								{weekDates.map((date, index) => {
									const isToday =
										date.toDateString() === new Date().toDateString();
									return (
										<th
											key={date.toISOString()}
											className={`min-w-[100px] border-l py-4 text-center font-bold text-sm uppercase tracking-wide ${
												isToday
													? "bg-primary/10 dark:bg-primary/20"
													: "bg-slate-50/95 dark:bg-slate-900/95"
											}`}
										>
											<div className="flex flex-col items-center gap-0.5">
												<span
													className={`text-base ${
														isToday
															? "font-bold text-primary"
															: "text-foreground"
													}`}
												>
													{DAYS[index]}
												</span>
												<span className="font-medium text-muted-foreground text-xs">
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
									<td className="sticky left-0 z-10 w-[200px] min-w-[200px] border-r bg-inherit py-3 pr-4 pl-5 font-semibold text-base tracking-wide">
										<div className="flex items-center gap-3">
											<div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary font-bold text-primary-foreground text-xs">
												{nurse
													.split(" ")
													.map((n) => n[0])
													.join("")}
											</div>
											<span className="truncate">{nurse}</span>
										</div>
									</td>
									{weekDates.map((date) => {
										const shift = getShiftForNurseAndDate(nurse, date);
										const isToday =
											date.toDateString() === new Date().toDateString();
										return (
											<td
												key={date.toISOString()}
												className={`border-l p-2 text-center transition-colors ${
													isToday ? "bg-primary/5" : ""
												}`}
											>
												{shift && <ShiftBadge type={shift.shiftType} />}
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</CardContent>
			</Card>
		</div>
	);
}

const nurseCount = NURSES.length;
