import { cn } from "@Duty-Roster/ui/lib/utils";

export function AllocationItem({
	current,
	target,
	color,
	label,
}: {
	current: number;
	target: number;
	color: string;
	label: string;
}) {
	const isOver = current > target;
	const isCorrect = current === target;

	return (
		<div
			className={cn(
				"flex items-center gap-1 whitespace-nowrap rounded p-0.5 transition-colors",
				isOver ? "bg-red-50" : isCorrect ? "bg-green-50" : "bg-slate-50",
			)}
			title={`${label} Shift: ${current} assigned / ${target} targeted`}
		>
			<div
				className={cn("h-1.5 w-1.5 shrink-0 rounded-full shadow-sm", color)}
			/>
			<span
				className={cn(
					"font-medium text-[10px]",
					isOver
						? "text-red-700"
						: isCorrect
							? "text-green-700"
							: "text-slate-600",
				)}
			>
				{current}/{target}
			</span>
		</div>
	);
}
