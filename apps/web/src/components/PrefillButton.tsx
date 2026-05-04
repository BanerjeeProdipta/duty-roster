"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { usePrefillRoster } from "@/hooks/usePrefillRoster";

export function PrefillButton({
	year,
	month,
	mode,
}: {
	year: number;
	month: number;
	mode: "fairly" | "minimize" | "maximize";
}) {
	const { mutate, isPending } = usePrefillRoster(mode);

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={() => mutate({ year, month })}
			disabled={isPending}
		>
			{mode === "fairly" && "Prefill Fairly"}
			{mode === "minimize" && "Minimize Shifts"}
			{mode === "maximize" && "Maximize Shifts"}
		</Button>
	);
}
