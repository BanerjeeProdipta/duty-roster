import { Suspense } from "react";
import { RosterHeader } from "@/features/dashboard/roster-table/RosterHeader";
import { RosterTable } from "@/features/dashboard/roster-table/RosterTable";
import { RosterTableSkeleton } from "@/features/dashboard/roster-table/RosterTableSkeleton";
import { getMonthDateRange, getYearMonthFromSearchParams } from "@/utils";
import { getTRPCServer } from "@/utils/trpc-server";

export const revalidate = 0;
export const runtime = "edge";

async function HomeContent(props: {
	searchParams: Promise<{ year?: string; month?: string }>;
}) {
	const { year, month } = await getYearMonthFromSearchParams(
		props.searchParams,
	);

	const { startDate, endDate } = getMonthDateRange(year, month);
	const trpcServer = await getTRPCServer();
	const initialSchedules = await trpcServer.roster.getSchedules.query({
		startDate,
		endDate,
	});

	return (
		<div className="flex flex-col gap-6">
			<RosterHeader initialSchedules={initialSchedules} />
			<Suspense fallback={<RosterTableSkeleton />}>
				<RosterTable initialSchedules={initialSchedules} />
			</Suspense>
		</div>
	);
}

export default function Home(props: {
	searchParams: Promise<{ year?: string; month?: string }>;
}) {
	return (
		<Suspense fallback={<RosterTableSkeleton />}>
			<HomeContent searchParams={props.searchParams} />
		</Suspense>
	);
}
