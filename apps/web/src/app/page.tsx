import { lazy, Suspense } from "react";
import { RosterHeader } from "@/features/dashboard/roster-table/RosterHeader";
import { RosterTableSkeleton } from "@/features/dashboard/roster-table/RosterTableSkeleton";
import { getMonthDateRange, getYearMonthFromSearchParams } from "@/utils";
import { getTRPCServer } from "@/utils/trpc-server";

const RosterTable = lazy(() =>
	import("@/features/dashboard/roster-table/RosterTable").then((mod) => ({
		default: mod.RosterTable,
	})),
);

export const revalidate = 60;

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
