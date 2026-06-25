interface CoverageConfigProps {
	weekday: { morning: number; evening: number; night: number };
	friday: { morning: number; evening: number; night: number };
}

export function CoverageConfig({ weekday, friday }: CoverageConfigProps) {
	return (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-gray-50 px-3 py-1.5 text-gray-600 text-xs">
			<span className="font-medium text-gray-700">Coverage:</span>
			<span>
				WEEKDAY{" "}
				<span className="font-semibold text-amber-700">M{weekday.morning}</span>{" "}
				<span className="font-semibold text-blue-700">E{weekday.evening}</span>{" "}
				<span className="font-semibold text-violet-700">N{weekday.night}</span>
			</span>
			<span className="text-gray-300">|</span>
			<span>
				FRIDAY{" "}
				<span className="font-semibold text-amber-700">M{friday.morning}</span>{" "}
				<span className="font-semibold text-blue-700">E{friday.evening}</span>{" "}
				<span className="font-semibold text-violet-700">N{friday.night}</span>
			</span>
		</div>
	);
}
