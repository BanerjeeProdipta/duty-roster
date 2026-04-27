import { Suspense } from "react";
import { MonthNavigator } from "@/components/MonthNavigator";
import { ShiftCounts } from "@/features/dashboard/components/ShiftCounts";
import { ShiftCountsSkeleton } from "@/features/dashboard/components/ShiftCountsSkeleton";
import { ShiftManagerSkeleton } from "@/features/shift-manager/components/ShiftManagerSkeleton";
import ShiftAllocationsClient from "@/features/shift-manager/ShiftAllocationsClient";
import { getMonthDateRange, getYearMonthFromSearchParams } from "@/utils";
import { getAuthedTRPCServer } from "@/utils/trpc-server";

export const revalidate = 0;
export const runtime = "edge";

async function ShiftAllocationsContent(props: {
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

	return (
		<div className="flex flex-col gap-6">
			<MonthNavigator />
			<ShiftCounts initialSchedules={initialSchedules} />
			<ShiftAllocationsClient initialSchedules={initialSchedules} />
		</div>
	);
}

function ShiftAllocationsLoading() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
			<ShiftCountsSkeleton />
			<ShiftManagerSkeleton />
		</div>
	);
}

export default function ShiftAllocationsPage(props: {
	searchParams: Promise<{ year?: string; month?: string; days?: string }>;
}) {
	return (
		<Suspense fallback={<ShiftAllocationsLoading />}>
			<ShiftAllocationsContent searchParams={props.searchParams} />
		</Suspense>
	);
}
