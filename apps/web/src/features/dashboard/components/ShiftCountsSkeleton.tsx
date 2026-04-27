"use client";

import { Skeleton } from "@Duty-Roster/ui/components/skeleton";

export function ShiftCountsSkeleton() {
	return (
		<div className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:p-4">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
				<div className="flex flex-col gap-2 rounded-lg border p-4">
					<Skeleton className="h-4 w-16" />
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-12" />
						<Skeleton className="h-4 w-8" />
					</div>
					<Skeleton className="h-3 w-20" />
				</div>
				<div className="flex flex-col gap-2 rounded-lg border p-4">
					<Skeleton className="h-4 w-20" />
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-12" />
						<Skeleton className="h-4 w-8" />
					</div>
					<Skeleton className="h-3 w-16" />
				</div>
				<div className="flex flex-col gap-2 rounded-lg border p-4">
					<Skeleton className="h-4 w-16" />
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-12" />
						<Skeleton className="h-4 w-8" />
					</div>
					<Skeleton className="h-3 w-20" />
				</div>
				<div className="flex flex-col gap-2 rounded-lg border p-4">
					<Skeleton className="h-4 w-12" />
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-12" />
						<Skeleton className="h-4 w-8" />
					</div>
					<Skeleton className="h-3 w-16" />
				</div>
			</div>
		</div>
	);
}
