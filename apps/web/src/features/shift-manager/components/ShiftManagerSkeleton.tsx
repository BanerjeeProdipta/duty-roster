"use client";

import { Skeleton } from "@Duty-Roster/ui/components/skeleton";

export function ShiftManagerSkeleton() {
	return (
		<div className="flex flex-col gap-6 rounded-xl border bg-white p-4">
			<div className="flex items-center justify-between">
				<Skeleton className="h-6 w-40" />
				<div className="flex gap-2">
					<Skeleton className="h-10 w-32" />
					<Skeleton className="h-10 w-28" />
				</div>
			</div>
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<div
						key={`shift-card-${i}`}
						className="flex flex-col gap-3 rounded-lg border p-4"
					>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Skeleton className="h-12 w-12 rounded-lg" />
								<div className="flex flex-col gap-1">
									<Skeleton className="h-5 w-24" />
									<Skeleton className="h-4 w-16" />
								</div>
							</div>
							<Skeleton className="h-8 w-8 rounded-full" />
						</div>
						<div className="flex flex-wrap gap-2">
							{Array.from({ length: 3 }).map((_, j) => (
								<Skeleton key={`tag-${j}`} className="h-8 w-20 rounded-lg" />
							))}
						</div>
						<div className="flex gap-2">
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-full" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
