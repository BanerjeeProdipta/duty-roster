"use client";

import { Skeleton } from "@Duty-Roster/ui/components/skeleton";

export function RosterPrintSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-2">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-32" />
					</div>
					<div className="flex gap-2">
						<Skeleton className="h-10 w-32" />
						<Skeleton className="h-10 w-24" />
					</div>
				</div>
			</div>
			<div className="rounded-xl border bg-white p-6 shadow-sm">
				<div className="mb-4 flex items-center justify-between">
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-4 w-24" />
				</div>
				<div className="space-y-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={`print-skeleton-${i}`}
							className="flex items-center gap-4"
						>
							<Skeleton className="h-12 w-full" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
