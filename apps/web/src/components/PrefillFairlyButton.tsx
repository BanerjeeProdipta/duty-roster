"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { Loader2 } from "lucide-react";
import { usePrefillFairPreferences } from "@/hooks/usePrefillFairPreferences";

export function PrefillFairlyButton({
	year,
	month,
}: {
	year: number;
	month: number;
}) {
	const { mutate, isPending } = usePrefillFairPreferences();

	return (
		<Button
			onClick={() => mutate({ year, month })}
			disabled={isPending}
			size="sm"
			variant="outline"
		>
			{isPending ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Prefilling...
				</>
			) : (
				"Prefill fairly"
			)}
		</Button>
	);
}
