import { getWeekdayCounts } from "@/utils";

const WeekDayCounts = ({ year, month }: { year: number; month: number }) => {
	const weekdayCounts = getWeekdayCounts(year, month);

	return (
		<div className="flex flex-wrap gap-2 text-sm">
			<span className="text-gray-500">SUN:</span>
			<span className="font-medium">{weekdayCounts.sun}</span>
			<span className="text-gray-500">MON:</span>
			<span className="font-medium">{weekdayCounts.mon}</span>
			<span className="text-gray-500">TUE:</span>
			<span className="font-medium">{weekdayCounts.tue}</span>
			<span className="text-gray-500">WED:</span>
			<span className="font-medium">{weekdayCounts.wed}</span>
			<span className="text-gray-500">THU:</span>
			<span className="font-medium">{weekdayCounts.thu}</span>
			<span className="text-gray-500">FRI:</span>
			<span className="font-medium">{weekdayCounts.fri}</span>
			<span className="text-gray-500">SAT:</span>
			<span className="font-medium">{weekdayCounts.sat}</span>
		</div>
	);
};

export default WeekDayCounts;
