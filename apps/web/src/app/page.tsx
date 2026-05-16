import { lazy, Suspense } from "react";
import { RosterHeader } from "@/features/dashboard/roster-table/RosterHeader";
import { RosterTableSkeleton } from "@/features/dashboard/roster-table/RosterTableSkeleton";
import { getMonthDateRange, getYearMonthFromSearchParams } from "@/utils";
import { getTRPCServer } from "@/utils/trpc-server";

export const runtime = "edge";

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
	try {
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
	} catch (e) {
		console.error("Failed to load roster:", e);
		return (
			<div className="flex flex-col gap-6">
				<RosterHeader initialSchedules={null} />
				<div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
					<p className="font-medium text-lg text-red-800">
						Unable to load the roster at this time.
					</p>
					<p className="mt-2 text-red-600 text-sm">
						Please try refreshing the page. If the problem persists, the server
						may be temporarily unavailable.
					</p>
				</div>
			</div>
		);
	}
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
