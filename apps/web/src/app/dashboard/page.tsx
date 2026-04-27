import { Suspense } from "react";
import { ShiftCounts } from "@/features/dashboard/components/ShiftCounts";
import { ShiftCountsSkeleton } from "@/features/dashboard/components/ShiftCountsSkeleton";
import { RosterHeader } from "@/features/dashboard/roster-table/RosterHeader";
import { RosterTable } from "@/features/dashboard/roster-table/RosterTable";
import { RosterTableSkeleton } from "@/features/dashboard/roster-table/RosterTableSkeleton";
import { getMonthDateRange, getYearMonthFromSearchParams } from "@/utils";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

export const revalidate = 0;
export const runtime = "edge";

async function DashboardContent(props: {
	searchParams: Promise<{ year?: string; month?: string }>;
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

	return (
		<div className="flex flex-col gap-6">
			<RosterHeader editable initialSchedules={initialSchedules} />
			<ShiftCounts initialSchedules={initialSchedules} />
			<RosterTable editable initialSchedules={initialSchedules} />
		</div>
	);
}

function DashboardLoading() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-slate-200" />
				<div className="flex items-center gap-4">
					<div className="h-10 w-40 animate-pulse rounded-lg bg-slate-200" />
					<div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200" />
				</div>
			</div>
			<ShiftCountsSkeleton />
			<RosterTableSkeleton />
		</div>
	);
}

export default function DashboardPage(props: {
	searchParams: Promise<{ year?: string; month?: string }>;
}) {
	return (
		<Suspense fallback={<DashboardLoading />}>
			<DashboardContent searchParams={props.searchParams} />
		</Suspense>
	);
}
