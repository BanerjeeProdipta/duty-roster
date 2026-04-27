"use client";

import { Skeleton } from "@Duty-Roster/ui/components/skeleton";

const HEADER_COUNT = 7;
const NURSE_ROW_COUNT = 8;

export function RosterTableSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			<div className="relative flex h-[calc(100vh-200px)] animate-fade-in flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
				<div className="scrollbar-hide min-h-0 flex-1 overflow-auto">
					<table className="w-full table-fixed border-separate border-spacing-0">
						<thead>
							<tr>
								<th
									className="sticky top-0 left-0 z-[30] border-r border-b bg-slate-50 px-3 py-3 text-center text-sm uppercase tracking-widest"
									style={{ width: "180px", height: "80px" }}
								>
									<Skeleton className="mx-auto h-4 w-16" />
								</th>
								{Array.from({ length: HEADER_COUNT }).map((_, i) => (
									<th
										key={i}
										className="sticky top-0 z-[10] bg-[#f2f2f2]"
										style={{ width: "140px", height: "80px" }}
									>
										<div className="flex flex-col items-center gap-1">
											<Skeleton className="h-4 w-8" />
											<Skeleton className="h-6 w-8" />
										</div>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{Array.from({ length: NURSE_ROW_COUNT }).map((_, rowIndex) => (
								<tr key={rowIndex}>
									<td
										className="sticky left-0 z-20 border-slate-200 border-b bg-white"
										style={{ width: "180px", minWidth: "180px", height: "80px" }}
									>
										<div className="h-full w-full border-r border-b bg-white px-3 py-3">
											<div className="flex h-full flex-col justify-center gap-2">
												<div className="flex items-center justify-between gap-1">
													<Skeleton className="h-4 w-24" />
													<Skeleton className="h-4 w-8" />
												</div>
												<div className="flex items-center gap-1">
													<Skeleton className="h-3 w-16" />
													<Skeleton className="h-3 w-12" />
												</div>
											</div>
										</div>
									</td>
									<td
										colSpan={HEADER_COUNT}
										className="border-slate-200 border-b"
										style={{ height: "80px" }}
									>
										<div className="flex h-full items-center justify-center gap-2">
											{Array.from({ length: 7 }).map((_, i) => (
												<Skeleton
													key={i}
													className="h-12 w-12 rounded-lg"
												/>
											))}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}