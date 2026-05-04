import { Skeleton } from "@Duty-Roster/ui/components/skeleton";
import { Suspense } from "react";
import { MonthNavigator } from "@/components/MonthNavigator";
import { PrefillButton } from "@/components/PrefillButton";
import { ShiftCountsSkeleton } from "@/features/dashboard/components/ShiftCountsSkeleton";
import { RosterTableSkeleton } from "@/features/dashboard/roster-table/RosterTableSkeleton";
import ShiftAllocationsClient from "@/features/shift-manager/ShiftAllocationsClient";
import WeekDayCounts from "@/features/shift-manager/WeekDayCounts";
import { getMonthDateRange, getYearMonthFromSearchParams } from "@/utils";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

export const revalidate = 0;

function ShiftAllocationsLoading() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<Skeleton className="h-10 w-full max-w-md rounded-lg" />
				<div className="flex items-center gap-4">
					<Skeleton className="h-10 w-40 rounded-lg" />
					<Skeleton className="h-10 w-32 rounded-lg" />
				</div>
			</div>
			<ShiftCountsSkeleton />
			<div className="flex h-10 w-full animate-pulse rounded-lg bg-slate-200" />
			<RosterTableSkeleton />
		</div>
	);
}

export default async function ShiftAllocationsPage(props: {
	searchParams: Promise<{ year?: string; month?: string; days?: string }>;
}) {
	const { year, month } = await getYearMonthFromSearchParams(
		props.searchParams,
	);
	const trpcServer = await getAuthedTRPCServer();
	const { startDate, endDate } = getMonthDateRange(year, month);
	const initialSchedules = await trpcServer.roster.getSchedules.query({
		startDate,
		endDate,
	});

	console.log("Initial schedules:", initialSchedules);

	return (
		<Suspense fallback={<ShiftAllocationsLoading />}>
			<div className="flex flex-col gap-6">
				<MonthNavigator />
				<div className="flex items-center justify-between">
					<WeekDayCounts month={month} year={year} />
					<div className="flex items-center gap-2">
						<PrefillButton year={year} month={month} mode="fairly" />
						<PrefillButton year={year} month={month} mode="minimize" />
						<PrefillButton year={year} month={month} mode="maximize" />
					</div>
				</div>
				<Suspense fallback={<ShiftCountsSkeleton />}>
					<ShiftAllocationsClient initialSchedules={initialSchedules} />
				</Suspense>
			</div>
		</Suspense>
	);
}
