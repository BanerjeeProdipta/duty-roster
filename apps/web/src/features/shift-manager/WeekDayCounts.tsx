import React from "react";
import { getWeekdayCounts } from "@/utils";

const WeekDayCounts = ({ year, month }: { year: number; month: number }) => {
	const weekdayCounts = getWeekdayCounts(year, month);

	return (
		<div className="flex flex-wrap gap-2 text-sm">
			<span className="text-slate-500">Sunday:</span>
			<span className="font-medium">{weekdayCounts.sun}</span>
			<span className="text-slate-500">Monday:</span>
			<span className="font-medium">{weekdayCounts.mon}</span>
			<span className="text-slate-500">Tuesday:</span>
			<span className="font-medium">{weekdayCounts.tue}</span>
			<span className="text-slate-500">Wednesday:</span>
			<span className="font-medium">{weekdayCounts.wed}</span>
			<span className="text-slate-500">Thursday:</span>
			<span className="font-medium">{weekdayCounts.thu}</span>
			<span className="text-slate-500">Friday:</span>
			<span className="font-medium">{weekdayCounts.fri}</span>
			<span className="text-slate-500">Saturday:</span>
			<span className="font-medium">{weekdayCounts.sat}</span>
		</div>
	);
};

export default WeekDayCounts;
